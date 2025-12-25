import hmac
import hashlib
import uuid
from typing import Optional, Tuple

from config import ANON_SECRET

COOKIE_NAME = "anon_id"
COOKIE_MAX_AGE = 60 * 60 * 24 * 180  # 180 days


def _sign(value: str) -> str:
    return hmac.new(ANON_SECRET.encode("utf-8"), value.encode("utf-8"), hashlib.sha256).hexdigest()


def encode(value: str) -> str:
    return f"{value}.{_sign(value)}"


def decode(cookie_value: Optional[str]) -> Optional[str]:
    if not cookie_value:
        return None
    parts = cookie_value.split(".", 1)
    if len(parts) != 2:
        return None
    value, sig = parts
    expected = _sign(value)
    if hmac.compare_digest(sig, expected):
        return value
    return None


def new_id() -> str:
    return uuid.uuid4().hex


def get_or_create(cookie_value: Optional[str]) -> Tuple[str, Optional[str]]:
    value = decode(cookie_value)
    if value:
        return value, None
    value = new_id()
    return value, encode(value)
