"""Планировщик рассылок."""
import asyncio
import logging
import time

from telethon.errors import (
    ChannelPrivateError, ChatAdminRequiredError, ChatRestrictedError, ChatWriteForbiddenError,
    FloodWaitError, SlowModeWaitError, UserBannedInChannelError,
)
from telethon.tl.types import InputPeerChannel, InputPeerChat

import accounts
import config
import db
from loader import bot

log = logging.getLogger(__name__)

# Чат запретил писать — убираем его из рассылки, а не пробуем снова
FORBIDDEN = (ChatWriteForbiddenError, UserBannedInChannelError, ChannelPrivateError,
             ChatAdminRequiredError, ChatRestrictedError)

_running: set[int] = set()


def _peer(chat):
    if chat["kind"] == "channel":
        return InputPeerChannel(chat["chat_id"], chat["access_hash"])
    return InputPeerChat(chat["chat_id"])


async def _still_active(mailing_id) -> bool:
    row = await db.one("SELECT status FROM mailings WHERE id=?", mailing_id)
    return bool(row) and row["status"] == "active"


async def run_round(m):
    acc = await db.one("SELECT * FROM accounts WHERE id=?", m["account_id"])
    user = await db.get_user(m["user_id"])
    settings = await db.get_settings()
    if not acc or not user or user["banned"] or \
            (settings["mailing_requires_sub"] == "1" and not db.sub_active(user)):
        await db.run("UPDATE mailings SET status='stopped' WHERE id=?", m["id"])
        return
    try:
        client = await accounts.get_client(acc)
    except accounts.AccountDead:
        return

    chats = await db.all("SELECT * FROM mailing_chats WHERE mailing_id=? AND active=1", m["id"])
    if not chats:
        await db.run("UPDATE mailings SET status='stopped' WHERE id=?", m["id"])
        return

    # К каждому сообщению добавляется подпись с юзернеймом бота
    text = f"{m['text']}\n\n@{(await bot.me()).username}"
    sent = failed = 0
    next_run = int(time.time()) + m["interval_min"] * 60
    for chat in chats:
        if not await _still_active(m["id"]):
            break
        try:
            await client.send_message(_peer(chat), text)
            sent += 1
        except FloodWaitError as e:
            # Telegram попросил подождать — ждём, длинное ожидание переносит весь круг
            if e.seconds > config.MAX_FLOOD_WAIT:
                next_run = max(next_run, int(time.time()) + e.seconds + 5)
                break
            await asyncio.sleep(e.seconds + 1)
            failed += 1
        except SlowModeWaitError:
            failed += 1
        except FORBIDDEN as e:
            failed += 1
            await db.run("UPDATE mailing_chats SET active=0, error=? WHERE mailing_id=? AND chat_id=?",
                         type(e).__name__, m["id"], chat["chat_id"])
        except accounts.DEAD_ERRORS:
            await accounts.mark_dead(acc)
            break
        except Exception:
            failed += 1
            log.exception("mailing %s -> chat %s", m["id"], chat["chat_id"])
        await asyncio.sleep(config.SEND_DELAY)

    await db.run("UPDATE mailings SET sent=sent+?, failed=failed+?, last_run=?, next_run=? WHERE id=?",
                 sent, failed, int(time.time()), next_run, m["id"])
    await db.run("UPDATE users SET total_sent = total_sent + ? WHERE id=?", sent, m["user_id"])


async def _guarded(m):
    try:
        await run_round(m)
    except Exception:
        log.exception("mailing %s", m["id"])
        await db.run("UPDATE mailings SET next_run=? WHERE id=?", int(time.time()) + m["interval_min"] * 60, m["id"])
    finally:
        _running.discard(m["id"])


async def scheduler():
    while True:
        try:
            due = await db.all("SELECT * FROM mailings WHERE status='active' AND next_run <= ?", int(time.time()))
            for m in due:
                if m["id"] not in _running:
                    _running.add(m["id"])
                    asyncio.create_task(_guarded(m))
        except Exception:
            log.exception("scheduler")
        await asyncio.sleep(15)
