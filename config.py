import os
from pathlib import Path

from cryptography.fernet import Fernet
from dotenv import load_dotenv

BASE_DIR = Path(__file__).parent
ENV_PATH = BASE_DIR / ".env"
load_dotenv(ENV_PATH)

BOT_TOKEN = os.getenv("BOT_TOKEN", "")
ADMIN_IDS = {int(x) for x in os.getenv("ADMIN_IDS", "").replace(" ", "").split(",") if x}

API_ID = int(os.getenv("API_ID") or 0)
API_HASH = os.getenv("API_HASH", "")

WEBAPP_URL = os.getenv("WEBAPP_URL", "").rstrip("/")
PORT = int(os.getenv("PORT") or 8080)

CRYPTOPAY_TOKEN = os.getenv("CRYPTOPAY_TOKEN", "")
XROCKET_TOKEN = os.getenv("XROCKET_TOKEN", "")
STAR_RATE_RUB = float(os.getenv("STAR_RATE_RUB") or 1.5)

# Ключ шифрования сессий аккаунтов. Создаётся один раз и дописывается в .env;
# если его потерять, все подключённые аккаунты придётся подключать заново.
SESSION_KEY = os.getenv("SESSION_KEY", "")
if not SESSION_KEY:
    SESSION_KEY = Fernet.generate_key().decode()
    with open(ENV_PATH, "a", encoding="utf-8") as f:
        f.write(f"\n# Ключ шифрования сессий (не терять и не публиковать)\nSESSION_KEY={SESSION_KEY}\n")

DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)
DB_PATH = DATA_DIR / "bot.db"

APP_NAME = "Heliys AutoPosting"
SUPPORT_URL = "https://t.me/apfov"
POLICY_URL = "https://telegra.ph/POLITIKA-KONFIDENCIALNOSTI-08-12-99"
OFFER_URL = "https://telegra.ph/PUBLICHNAYA-OFERTA-08-12-15"

# Пакеты пополнения: hlx -> рубли
PACKAGES = [
    {"id": "p50", "hlx": 50, "rub": 100},
    {"id": "p100", "hlx": 100, "rub": 200},
    {"id": "p200", "hlx": 200, "rub": 380},
    {"id": "p500", "hlx": 500, "rub": 600},
]

# Подписка: цена в hlx
SUB_PLANS = [
    {"id": "d1", "days": 1, "price": 30, "title": "1 день"},
    {"id": "d7", "days": 7, "price": 100, "title": "7 дней"},
    {"id": "d30", "days": 30, "price": 200, "title": "Месяц"},
]

REF_BONUS = 10      # hlx за приглашённого
REF_PERCENT = 10    # % с каждого его пополнения

ACC_LIMIT_FREE = 5
ACC_LIMIT_SUB = 10

# Ограничения рассылки
INTERVALS = [30, 60, 120, 240, 720, 1440]   # минут между кругами
SEND_DELAY = 6                               # секунд между сообщениями в разные чаты
MAX_CHATS = 100
MAX_TEXT = 4000                              # запас до лимита Telegram под подпись бота
MAX_FLOOD_WAIT = 300                         # дольше этого не ждём, а переносим круг
