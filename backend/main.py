from fastapi import FastAPI, WebSocket
from routes import router
from websocket import websocket_endpoint
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.include_router(router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.websocket("/ws/{session_id}")
async def websocket_route(websocket: WebSocket, session_id: str):
    await websocket_endpoint(websocket, session_id)
