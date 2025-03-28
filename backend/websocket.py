from fastapi import WebSocket, WebSocketDisconnect
from redis import Redis
from urllib.parse import parse_qs
from typing import Dict
import json
import os
import jwt

redis = Redis(host="localhost", port=6379, decode_responses=True)
live_connections: Dict[str, Dict[str, WebSocket]] = {}

JWT_SECRET = os.getenv("JWT_SECRET", "secret")


def get_username_from_token(token: str):
    if not token:
        return None
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload.get("sub")
    except jwt.PyJWTError:
        return None


async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await websocket.accept()

    query_params = parse_qs(websocket.url.query)
    token = query_params.get("token", [None])[0]
    name_param = query_params.get("name", [None])[0]

    username = get_username_from_token(token) or name_param

    if not username:
        await websocket.close(code=4001)
        return

    user_id = websocket.headers.get("sec-websocket-key")  # unique-ish socket ID
    if session_id not in live_connections:
        live_connections[session_id] = {}
    live_connections[session_id][user_id] = websocket

    # Save initial state
    redis.hset(f"collab:{session_id}", user_id, json.dumps({
        "name": username,
        "cursor": None,
        "selection": None
    }))

    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)


            # If cursor_update then set cursor position in redis
            if msg.get("type") == "cursor_update":
                redis.hset(f"collab:{session_id}", user_id, json.dumps({
                    "name": username,
                    "cursor": msg.get("cursor"),
                    "selection": msg.get("selection"),
                }))

            # If code update, store code temporarily in Redis
            if msg.get("type") == "code":
                redis.set(f"code:{session_id}", msg.get("code"))

                # Send updated code to all except sender
                for uid, conn in live_connections[session_id].items():
                    if conn != websocket and conn.client_state.name == "CONNECTED":
                        await conn.send_text(json.dumps({
                            "type": "code",
                            "code": msg.get("code")
                        }))

            # Broadcast updated collaborator states
            all_states = redis.hgetall(f"collab:{session_id}")
            broadcast = {
                "type": "collaborators",
                "collaborators": {uid: json.loads(state) for uid, state in all_states.items()}
            }

            for uid, conn in live_connections[session_id].items():
                if conn.client_state.name == "CONNECTED":
                    await conn.send_text(json.dumps(broadcast))

    except WebSocketDisconnect:
        pass

    finally:
        live_connections[session_id].pop(user_id, None)
        redis.hdel(f"collab:{session_id}", user_id)

        if not live_connections[session_id]:
            # Save final code to Mongo
            code = redis.get(f"code:{session_id}")
            if code:
                await save_code_to_mongo(session_id, code)
            redis.delete(f"code:{session_id}")
            redis.delete(f"collab:{session_id}")
            live_connections.pop(session_id, None)


async def save_code_to_mongo(session_id: str, code: str):
    from database import mongo_db
    await mongo_db.sessions.update_one({"_id": session_id}, {"$set": {"code": code}})
