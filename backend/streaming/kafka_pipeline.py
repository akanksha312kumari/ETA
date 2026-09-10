import json
import asyncio
from typing import Dict, Any, Callable, Optional
from backend.streaming.pipeline_trigger import process_rtis_telemetry

# Kafka topic name
KAFKA_TOPIC = "train-location"
KAFKA_BOOTSTRAP_SERVERS = "localhost:9092"

class StreamingManager:
    """
    Streaming Pipeline Manager supporting Apache Kafka with seamless
    In-Memory Asyncio Queue Fallback when Kafka broker is offline.
    """
    def __init__(self, topic: str = KAFKA_TOPIC):
        self.topic = topic
        self.use_kafka = False
        self.producer = None
        self.consumer = None
        self.in_memory_queue: asyncio.Queue = asyncio.Queue()
        self.latest_pipeline_result: Optional[Dict[str, Any]] = None
        self._init_kafka()

    def _init_kafka(self):
        """Attempts to initialize Apache Kafka producer/consumer."""
        try:
            from kafka import KafkaProducer, KafkaConsumer
            self.producer = KafkaProducer(
                bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
                value_serializer=lambda v: json.dumps(v).encode('utf-8'),
                request_timeout_ms=1000
            )
            self.use_kafka = True
            print(f"[KAFKA PIPELINE] Successfully connected to Apache Kafka at {KAFKA_BOOTSTRAP_SERVERS} (Topic: {self.topic})")
        except Exception as e:
            self.use_kafka = False
            print(f"[STREAMING FALLBACK] Apache Kafka offline ({e}). Using Development In-Memory Stream Manager.")

    async def publish_telemetry(self, telemetry: Dict[str, Any]):
        """Publishes simulated RTIS GPS telemetry message to streaming pipeline and WebSocket clients."""
        if self.use_kafka and self.producer:
            try:
                self.producer.send(self.topic, telemetry)
                self.producer.flush()
            except Exception as e:
                print(f"[KAFKA PUBLISH ERROR] {e}. Falling back to in-memory queue.")
                await self.in_memory_queue.put(telemetry)
        else:
            await self.in_memory_queue.put(telemetry)

        # Trigger end-to-end mathematical + XGBoost + SciPy pipeline
        result = process_rtis_telemetry(telemetry)
        self.latest_pipeline_result = result

        # Broadcast live updates to all connected WebSocket clients
        try:
            from backend.app.routers.websocket import ws_manager
            await ws_manager.broadcast(result)
        except Exception as ws_err:
            pass

        return result

    async def get_next_telemetry(self) -> Dict[str, Any]:
        """Gets next message from queue."""
        return await self.in_memory_queue.get()

# Global Stream Manager instance
stream_manager = StreamingManager()
