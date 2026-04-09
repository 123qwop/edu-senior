"""Short-lived tickets so browsers can open WebSockets without reading httpOnly cookies."""

import secrets
import threading
import time
from typing import Dict, Optional, Tuple

_store: Dict[str, Tuple[int, float]] = {}
_lock = threading.Lock()
_TTL_SEC = 120


def issue_ticket(user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    with _lock:
        _cleanup_locked()
        _store[token] = (user_id, time.time() + _TTL_SEC)
    return token


def consume_ticket(token: str) -> Optional[int]:
    if not token:
        return None
    with _lock:
        _cleanup_locked()
        item = _store.pop(token, None)
        if not item:
            return None
        uid, exp = item
        if time.time() > exp:
            return None
        return uid


def _cleanup_locked() -> None:
    now = time.time()
    dead = [k for k, (_, exp) in _store.items() if exp < now]
    for k in dead:
        _store.pop(k, None)
