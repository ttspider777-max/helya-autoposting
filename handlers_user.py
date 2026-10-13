import html
import re

from aiogram import BaseMiddleware, F, Router
from aiogram.exceptions import TelegramBadRequest
from aiogram.filters import CommandObject, CommandStart
from aiogram.types import (
    CallbackQuery, InlineKeyboardButton, InlineKeyboardMarkup, Message, PreCheckoutQuery, WebAppInfo,
)

import config
import db
import gate
import payments

router = Router()

DOCS_TEXT = "<b>Документы</b>\n\nИспользуя бота, вы принимаете условия этих документов."


class UserMiddleware(BaseMiddleware):
    """Регистрирует пользователя и отсекает забаненных."""

    async def __call__(self, handler, event, data):
        tg_user = data.get("event_from_user")
        if tg_user and not tg_user.is_bot:
            user, is_new = await db.upsert_user(tg_user.id, tg_user.username, tg_user.first_name, tg_user.is_premium)
            if user["banned"] and tg_user.id not in config.ADMIN_IDS:
                return
            data["user"], data["is_new"] = user, is_new
        return await handler(event, data)


def button(text, emoji_id="", **kwargs):
    if emoji_id:
        kwargs["icon_custom_emoji_id"] = emoji_id
    return InlineKeyboardButton(text=text, **kwargs)


def menu_kb(settings, plain=False):
    def emoji(key):
        return "" if plain else settings[f"btn_{key}_emoji"]

    rows = []
    if config.WEBAPP_URL:
        rows.append([button(settings["btn_app_text"], emoji("app"), web_app=WebAppInfo(url=config.WEBAPP_URL))])
    rows.append([button(settings["btn_support_text"], emoji("support"), url=config.SUPPORT_URL),
                 button(settings["btn_docs_text"], emoji("docs"), callback_data="docs")])
    return InlineKeyboardMarkup(inline_keyboard=rows)


def strip_custom_emoji(text):
    return re.sub(r"<tg-emoji[^>]*>(.*?)</tg-emoji>", r"\1", text)


async def send_menu(message: Message, first_name):
    settings = await db.get_settings()
    text = settings["greeting"].replace("{name}", html.escape(first_name or "друг"))
    try:
        await message.answer(text, reply_markup=menu_kb(settings))
    except TelegramBadRequest:
        # премиум-эмодзи недоступны боту (у владельца нет Premium) — шлём без них
        await message.answer(strip_custom_emoji(text), reply_markup=menu_kb(settings, plain=True))


async def send_gate(message: Message, missing):
    rows = [[InlineKeyboardButton(text=c["title"], url=c["url"])] for c in missing]
    rows.append([InlineKeyboardButton(text="✅ Я подписался", callback_data="check_sub")])
    await message.answer("Чтобы пользоваться ботом, подпишитесь на каналы:",
                         reply_markup=InlineKeyboardMarkup(inline_keyboard=rows))


@router.message(CommandStart())
async def start(message: Message, command: CommandObject, user: dict, is_new: bool):
    args = command.args or ""
    if is_new and args.startswith("ref") and args[3:].isdigit():
        await db.set_referrer(user["id"], int(args[3:]))
    missing = await gate.missing_channels(user["id"])
    if missing:
        return await send_gate(message, missing)
    await send_menu(message, user["first_name"])


@router.callback_query(F.data == "check_sub")
async def check_sub(call: CallbackQuery, user: dict):
    missing = await gate.missing_channels(user["id"])
    if missing:
        return await call.answer("Вы подписались не на все каналы", show_alert=True)
    await call.message.delete()
    await send_menu(call.message, user["first_name"])
    await call.answer()


@router.callback_query(F.data == "docs")
async def docs(call: CallbackQuery):
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="Политика конфиденциальности", url=config.POLICY_URL)],
        [InlineKeyboardButton(text="Пользовательское соглашение", url=config.OFFER_URL)],
        [InlineKeyboardButton(text="‹ Назад", callback_data="menu")],
    ])
    await call.message.edit_text(DOCS_TEXT, reply_markup=kb)
    await call.answer()


@router.callback_query(F.data == "menu")
async def back_to_menu(call: CallbackQuery, user: dict):
    await call.message.delete()
    await send_menu(call.message, user["first_name"])
    await call.answer()


# ---------- оплата звёздами ----------

@router.pre_checkout_query()
async def pre_checkout(query: PreCheckoutQuery):
    payload = query.invoice_payload
    ok = payload.startswith("pay:") and bool(
        await db.one("SELECT 1 FROM payments WHERE id=? AND user_id=?", int(payload[4:]), query.from_user.id))
    await query.answer(ok=ok, error_message=None if ok else "Счёт не найден, создайте новый")


@router.message(F.successful_payment)
async def paid(message: Message):
    payload = message.successful_payment.invoice_payload
    if payload.startswith("pay:"):
        await payments.credit(int(payload[4:]))
