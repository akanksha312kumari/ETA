import asyncio
import json
from typing import List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(tags=["WebSockets"])

class ConnectionManager:
    """Manages active WebSocket client connections for real-time telemetry streaming."""
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"[WEBSOCKET] Client connected. Total active clients: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            print(f"[WEBSOCKET] Client disconnected. Active clients remaining: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"[WEBSOCKET BROADCAST ERROR] {e}")
                self.disconnect(connection)

ws_manager = ConnectionManager()

@router.websocket("/ws/telemetry")
async def websocket_telemetry_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time RTIS telemetry & downstream station ETA updates.
    """
    await ws_manager.connect(websocket)
    try:
        from backend.simulator.rtis_simulator import RTISSimulator
        from backend.streaming.kafka_pipeline import stream_manager

        # Send immediate initial status payload
        if stream_manager.latest_pipeline_result:
            await websocket.send_json(stream_manager.latest_pipeline_result)

        while True:
            # Keep connection alive & receive optional client heartbeat
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        print(f"[WEBSOCKET EXCEPTION] {e}")
        ws_manager.disconnect(websocket)
