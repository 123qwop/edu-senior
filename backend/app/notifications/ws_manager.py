"""In-memory WebSocket connections per user (single-server deployments)."""

from __future__ import annotations

import asyncio
from collections import defaultdict
from typing import Any, DefaultDict, List

from starlette.websockets import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self._connections: DefaultDict[int, List[WebSocket]] = defaultdict(list)
        self._lock = asyncio.Lock()

    async def connect(self, user_id: int, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._connections[user_id].append(websocket)

    async def disconnect(self, user_id: int, websocket: WebSocket) -> None:
        async with self._lock:
            conns = self._connections.get(user_id)
            if not conns:
                return
            if websocket in conns:
                conns.remove(websocket)
            if not conns:
                del self._connections[user_id]

    async def send_json_to_user(self, user_id: int, payload: dict[str, Any]) -> None:
        async with self._lock:
            conns = list(self._connections.get(user_id, []))
        dead: List[WebSocket] = []
        for ws in conns:
            try:
                await ws.send_json(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            await self.disconnect(user_id, ws)


manager = ConnectionManager()
