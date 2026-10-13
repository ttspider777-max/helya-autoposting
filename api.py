"""HTTP API и раздача Mini App."""
import hashlib
import hmac
import json
import logging
import time
from urllib.parse import parse_qsl

from aiohttp import web

import accounts
import config
import db
import gate
import payments
from loader import bot

log = logging.getLogger(__name__)
routes = web.RouteTableDef()
WEBAPP_DIR = config.BASE_DIR / "webapp"
INIT_DATA_TTL = 86400


class ApiError(Exception):
    pass


def err(message, status=400, **extra):
    return web.json_response({"error": message, **extra}, status=status)


def validate_init_data(init_data: str) -> dict | None:
    """Проверяет подпись Telegram и возвращает данные пользователя."""
    try:
        pairs = dict(parse_qsl(init_data, keep_blank_values=True, strict_parsing=True))
        received = pairs.pop("hash")
        check = "\n".join(f"{k}={v}" for k, v in sorted(pairs.items()))
        secret = hmac.new(b"WebAppData", config.BOT_TOKEN.encode(), hashlib.sha256).digest()
        expected = hmac.new(secret, check.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, received):
            return None
        if time.time() - int(pairs["auth_date"]) > INIT_DATA_TTL:
            return None
        return json.loads(pairs["user"])
    except (KeyError, ValueError):
        return None


@web.middleware
async def auth(request, handler):
    if not request.path.startswith("/api/"):
        return await handler(request)
    tg_user = validate_init_data(request.headers.get("X-Init-Data", ""))
    if not tg_user:
        return err("unauthorized", 401)
    user, _ = await db.upsert_user(tg_user["id"], tg_user.get("username"), tg_user.get("first_name"),
                                   tg_user.get("is_premium", False))
    if user["banned"] and user["id"] not in config.ADMIN_IDS:
        return err("banned", 403)
    missing = await gate.missing_channels(user["id"])
    if missing:
        return err("subscribe", 403, channels=[{"title": c["title"], "url": c["url"]} for c in missing])
    request["user"] = user
    try:
        return await handler(request)
    except (ApiError, accounts.AccError, payments.PayError) as e:
        return err(str(e))
    except accounts.AccountDead:
        return err("Сессия аккаунта завершена, подключите его заново")
    except Exception:
        log.exception("api %s", request.path)
        return err("Внутренняя ошибка", 500)


async def body(request) -> dict:
    try:
        data = await request.json()
    except ValueError:
        data = None
    if not isinstance(data, dict):
        raise ApiError("Неверный запрос")
    return data


async def own_account(request):
    acc = await db.one("SELECT * FROM accounts WHERE id=? AND user_id=?",
                       int(request.match_info["id"]), request["user"]["id"])
    if not acc:
        raise ApiError("Аккаунт не найден")
    return acc


async def own_mailing(request):
    m = await db.one("SELECT * FROM mailings WHERE id=? AND user_id=?",
                     int(request.match_info["id"]), request["user"]["id"])
    if not m:
        raise ApiError("Рассылка не найдена")
    return m


async def require_mailing_access(user):
    settings = await db.get_settings()
    if settings["mailing_requires_sub"] == "1" and not db.sub_active(user):
        raise ApiError("Для рассылок нужна активная подписка")


# ---------- профиль ----------

@routes.get("/api/me")
async def me(request):
    user = request["user"]
    me_bot = await bot.me()
    refs = (await db.one("SELECT COUNT(*) c FROM users WHERE referrer_id=?", user["id"]))["c"]
    settings = await db.get_settings()
    return web.json_response({
        "user": {
            "id": user["id"], "name": user["first_name"], "balance": user["balance"],
            "sub_until": user["sub_until"], "sub_active": db.sub_active(user), "acc_limit": db.acc_limit(user),
        },
        "ref": {
            "link": f"https://t.me/{me_bot.username}?start=ref{user['id']}", "count": refs,
            "earned": user["ref_earned"], "bonus": config.REF_BONUS, "percent": config.REF_PERCENT,
        },
        "packages": [{**p, "stars": payments.stars_price(p["rub"])} for p in config.PACKAGES],
        "plans": config.SUB_PLANS,
        "intervals": config.INTERVALS,
        "limits": {"free": config.ACC_LIMIT_FREE, "sub": config.ACC_LIMIT_SUB, "chats": config.MAX_CHATS,
                   "text": config.MAX_TEXT},
        "bot_username": me_bot.username,
        "links": {"support": config.SUPPORT_URL, "policy": config.POLICY_URL, "offer": config.OFFER_URL},
        "mailing_requires_sub": settings["mailing_requires_sub"] == "1",
    })


@routes.get("/api/history")
async def history(request):
    user = request["user"]
    tx = await db.all("SELECT amount, kind, note, created_at FROM transactions WHERE user_id=? "
                      "ORDER BY id DESC LIMIT 50", user["id"])
    counts = await db.one(
        "SELECT (SELECT COUNT(*) FROM accounts WHERE user_id=?1) accounts, "
        "(SELECT COUNT(*) FROM mailings WHERE user_id=?1 AND status='active') active", user["id"])
    return web.json_response({"transactions": tx, "stats": {**counts, "sent": user["total_sent"]}})


@routes.post("/api/sub/buy")
async def sub_buy(request):
    user = request["user"]
    plan = next((p for p in config.SUB_PLANS if p["id"] == (await body(request)).get("plan")), None)
    if not plan:
        raise ApiError("Неверный тариф")
    cur = await db.run("UPDATE users SET balance = balance - ?1 WHERE id=?2 AND balance >= ?1", plan["price"], user["id"])
    if cur.rowcount == 0:
        raise ApiError("Недостаточно hlx на балансе")
    await db.run("INSERT INTO transactions(user_id, amount, kind, note, created_at) VALUES(?,?,?,?,?)",
                 user["id"], -plan["price"], "sub", f"Подписка · {plan['title']}", int(time.time()))
    until = await db.add_sub_days(user["id"], plan["days"])
    return web.json_response({"sub_until": until})


# ---------- оплата ----------

@routes.post("/api/pay/create")
async def pay_create(request):
    data = await body(request)
    return web.json_response(await payments.create(request["user"]["id"], data.get("package"), data.get("method")))


@routes.post("/api/pay/check")
async def pay_check(request):
    data = await body(request)
    status = await payments.check(int(data.get("payment_id") or 0), request["user"]["id"])
    return web.json_response({"status": status})


# ---------- аккаунты ----------

@routes.get("/api/accounts")
async def accounts_list(request):
    rows = await db.all(
        "SELECT a.id, a.name, a.username, a.phone, a.alive, "
        "EXISTS(SELECT 1 FROM mailings m WHERE m.account_id=a.id AND m.status='active') busy "
        "FROM accounts a WHERE a.user_id=? ORDER BY a.id", request["user"]["id"])
    for r in rows:
        r["phone"] = accounts.mask_phone(r["phone"])
    return web.json_response({"accounts": rows})


@routes.post("/api/accounts/send_code")
async def acc_send_code(request):
    await accounts.send_code(request["user"], (await body(request)).get("phone"))
    return web.json_response({"ok": True})


@routes.post("/api/accounts/sign_in")
async def acc_sign_in(request):
    done = await accounts.sign_in(request["user"], (await body(request)).get("code"))
    return web.json_response({"done": done, "need_password": not done})


@routes.post("/api/accounts/password")
async def acc_password(request):
    await accounts.sign_in_password(request["user"], (await body(request)).get("password") or "")
    return web.json_response({"done": True})


@routes.post("/api/accounts/cancel")
async def acc_cancel(request):
    await accounts.cancel_login(request["user"]["id"])
    return web.json_response({"ok": True})


@routes.post("/api/accounts/{id:\\d+}/delete")
async def acc_delete(request):
    await accounts.remove(await own_account(request))
    return web.json_response({"ok": True})


@routes.get("/api/accounts/{id:\\d+}/chats")
async def acc_chats(request):
    acc = await own_account(request)
    if not acc["alive"]:
        raise ApiError("Сессия аккаунта завершена, подключите его заново")
    return web.json_response({"chats": await accounts.scan_chats(acc)})


# ---------- рассылки ----------

@routes.get("/api/mailings")
async def mailings_list(request):
    rows = await db.all(
        "SELECT m.id, m.text, m.interval_min, m.status, m.sent, m.failed, m.next_run, m.last_run, a.name account, "
        "(SELECT COUNT(*) FROM mailing_chats c WHERE c.mailing_id=m.id AND c.active=1) chats "
        "FROM mailings m JOIN accounts a ON a.id=m.account_id WHERE m.user_id=? ORDER BY m.id DESC",
        request["user"]["id"])
    return web.json_response({"mailings": rows})


@routes.post("/api/mailings")
async def mailing_create(request):
    user = request["user"]
    await require_mailing_access(user)
    data = await body(request)
    acc = await db.one("SELECT * FROM accounts WHERE id=? AND user_id=? AND alive=1",
                       int(data.get("account_id") or 0), user["id"])
    if not acc:
        raise ApiError("Аккаунт не найден")
    text = str(data.get("text") or "").strip()
    if not 1 <= len(text) <= config.MAX_TEXT:
        raise ApiError(f"Текст должен быть от 1 до {config.MAX_TEXT} символов")
    interval = data.get("interval")
    if interval not in config.INTERVALS:
        raise ApiError("Неверный интервал")
    scanned = accounts.scans.get(acc["id"], {})
    chat_ids = data.get("chat_ids")
    chats = [scanned[c] for c in dict.fromkeys(chat_ids if isinstance(chat_ids, list) else []) if c in scanned]
    if not 1 <= len(chats) <= config.MAX_CHATS:
        raise ApiError(f"Выберите от 1 до {config.MAX_CHATS} чатов")
    if await db.one("SELECT 1 FROM mailings WHERE account_id=? AND status='active'", acc["id"]):
        raise ApiError("На этом аккаунте уже идёт рассылка")
    now = int(time.time())
    cur = await db.run("INSERT INTO mailings(user_id, account_id, text, interval_min, next_run, created_at) "
                       "VALUES(?,?,?,?,?,?)", user["id"], acc["id"], text, interval, now, now)
    for c in chats:
        await db.run("INSERT INTO mailing_chats(mailing_id, chat_id, kind, access_hash, title) VALUES(?,?,?,?,?)",
                     cur.lastrowid, c["id"], c["kind"], c["access_hash"], c["title"])
    return web.json_response({"id": cur.lastrowid})


@routes.post("/api/mailings/{id:\\d+}/stop")
async def mailing_stop(request):
    m = await own_mailing(request)
    await db.run("UPDATE mailings SET status='stopped' WHERE id=?", m["id"])
    return web.json_response({"ok": True})


@routes.post("/api/mailings/{id:\\d+}/start")
async def mailing_start(request):
    m = await own_mailing(request)
    await require_mailing_access(request["user"])
    if not await db.one("SELECT 1 FROM accounts WHERE id=? AND alive=1", m["account_id"]):
        raise ApiError("Сессия аккаунта завершена, подключите его заново")
    if await db.one("SELECT 1 FROM mailings WHERE account_id=? AND status='active' AND id != ?",
                    m["account_id"], m["id"]):
        raise ApiError("На этом аккаунте уже идёт рассылка")
    # возобновление не сбрасывает паузу между кругами
    next_run = max(int(time.time()), m["last_run"] + m["interval_min"] * 60)
    await db.run("UPDATE mailings SET status='active', next_run=? WHERE id=?", next_run, m["id"])
    return web.json_response({"ok": True})


@routes.post("/api/mailings/{id:\\d+}/delete")
async def mailing_delete(request):
    m = await own_mailing(request)
    await db.run("DELETE FROM mailing_chats WHERE mailing_id=?", m["id"])
    await db.run("DELETE FROM mailings WHERE id=?", m["id"])
    return web.json_response({"ok": True})


# ---------- статика ----------

def _file(name):
    async def handler(request):
        return web.FileResponse(WEBAPP_DIR / name, headers={"Cache-Control": "no-cache"})
    return handler


def build_app() -> web.Application:
    app = web.Application(middlewares=[auth])
    app.add_routes(routes)
    app.router.add_get("/", _file("index.html"))
    for name in ("style.css", "app.js"):
        app.router.add_get(f"/{name}", _file(name))
    return app
