"""
Example `config.py` — replace values or use environment variables.

This file is intentionally minimal and contains placeholder values.
"""

from os import environ

TELEGRAM_BOT_TOKEN = environ.get("TELEGRAM_BOT_TOKEN", "YOUR_TELEGRAM_BOT_TOKEN")
JAVA_BASE_URL = environ.get("JAVA_BASE_URL", "http://example.com")
JAVA_API_PATHS = {
    "bridge": "/api/bridge",
    "cancel": "/api/bridge/cancel",
}
JAVA_AUTH_SCHEME = environ.get("JAVA_AUTH_SCHEME", "none")
JAVA_AUTH_SECRET = environ.get("JAVA_AUTH_SECRET", "")

# Storage/logging paths (examples)
STORAGE_PATH = "data/users.json"
LOG_PATH = "logs/bot.log"
LOG_LEVEL = "INFO"

# Use environment variables in production. Do NOT commit real secrets.
