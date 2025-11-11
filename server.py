import asyncio
import contextlib
import json
import random
from copy import deepcopy
from datetime import datetime, timezone
from typing import Any, Dict, Optional, TypedDict

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse


class DeviceState(TypedDict, total=False):
  key: str
  label: str
  isOn: bool
  status: str
  value: Optional[float]
  unit: Optional[str]
  meta: Dict[str, Any]
  updatedAt: str


DEVICE_TEMPLATES: Dict[str, DeviceState] = {
  "lights": {
    "key": "lights",
    "label": "Luminous Lights",
    "isOn": True,
    "status": "Soft glow at 70%",
    "value": 70,
    "unit": "%",
    "meta": {"scene": "Evening"},
  },
  "ac": {
    "key": "ac",
    "label": "Zen Climate",
    "isOn": True,
    "status": "Holding at 22°C",
    "value": 22,
    "unit": "°C",
    "meta": {"mode": "Auto", "humidity": 42},
  },
  "doorLock": {
    "key": "doorLock",
    "label": "Sentinel Lock",
    "isOn": True,
    "status": "Door locked",
    "meta": {"locked": True},
  },
  "camera": {
    "key": "camera",
    "label": "Halo Vision",
    "isOn": True,
    "status": "Live monitoring",
    "meta": {"recording": True, "fps": 120},
  },
  "coffeeMaker": {
    "key": "coffeeMaker",
    "label": "Brew Maestro",
    "isOn": False,
    "status": "Standby",
    "meta": {"bean": "Ethiopian Blend"},
  },
  "music": {
    "key": "music",
    "label": "Pulse Audio",
    "isOn": True,
    "status": "Playing Chillwave Essentials",
    "value": 55,
    "unit": "%",
    "meta": {"track": "Stellar Drift"},
  },
}


def iso_now() -> str:
  return datetime.now(timezone.utc).isoformat()


app = FastAPI(
  title="HomeOne Control Server",
  version="1.0.0",
  default_response_class=JSONResponse,
)

app.add_middleware(
  CORSMiddleware,
  allow_origins=["*"],
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)

active_devices: Dict[str, DeviceState] = {
  key: {**state, "updatedAt": iso_now()} for key, state in DEVICE_TEMPLATES.items()
}
connections: set[WebSocket] = set()
state_lock = asyncio.Lock()
simulator_task: Optional[asyncio.Task] = None


async def broadcast(message: Dict[str, Any]) -> None:
  stale: list[WebSocket] = []
  payload = json.dumps(message)
  for ws in connections.copy():
    try:
      await ws.send_text(payload)
    except Exception:
      stale.append(ws)
  for ws in stale:
    connections.discard(ws)


async def send_snapshot(websocket: WebSocket) -> None:
  async with state_lock:
    snapshot = deepcopy(active_devices)
  await websocket.send_json(
    {
      "type": "snapshot",
      "payload": {
        "devices": snapshot,
        "reportedAt": iso_now(),
      },
    }
  )


def mutate_device_state(key: str, current: DeviceState) -> DeviceState:
  updated = deepcopy(current)
  updated["updatedAt"] = iso_now()

  if key == "lights":
    brightness = random.randint(10, 100)
    updated["value"] = brightness
    updated["isOn"] = brightness > 5
    updated["status"] = f"Soft glow at {brightness}%"
    updated.setdefault("meta", {})["scene"] = random.choice(
      ["Aurora", "Studio", "Sunset"]
    )
  elif key == "ac":
    temperature = random.randint(19, 25)
    humidity = random.randint(35, 55)
    updated["value"] = temperature
    updated["isOn"] = True
    updated["status"] = f"Holding at {temperature}°C"
    updated.setdefault("meta", {})
    updated["meta"]["humidity"] = humidity
    updated["meta"]["mode"] = random.choice(["Auto", "Eco", "Cool"])
  elif key == "doorLock":
    should_toggle = random.random() > 0.85
    if should_toggle:
      locked = not bool(updated.get("meta", {}).get("locked", True))
      updated["isOn"] = locked
      updated.setdefault("meta", {})["locked"] = locked
      updated["status"] = "Door locked" if locked else "Door unlocked"
  elif key == "camera":
    active = random.random() > 0.2
    updated["isOn"] = active
    updated.setdefault("meta", {})["recording"] = active
    updated["status"] = "Live monitoring" if active else "Privacy mode"
  elif key == "coffeeMaker":
    brewing = random.random() > 0.7
    updated["isOn"] = brewing
    updated["status"] = "Pouring a flat white" if brewing else "Standby"
    updated.setdefault("meta", {})["bean"] = random.choice(
      ["Ethiopian Blend", "Kenyan AA", "Colombian Supremo"]
    )
  elif key == "music":
    volume = random.randint(10, 85)
    updated["isOn"] = volume > 5
    updated["value"] = volume
    track = random.choice(
      ["Stellar Drift", "Neon Nights", "Skyline Echoes", "Lunar Tide"]
    )
    updated.setdefault("meta", {})["track"] = track
    updated["status"] = f"Playing {track}"
  return updated


async def simulator_loop() -> None:
  await asyncio.sleep(2)
  while True:
    await asyncio.sleep(random.uniform(3, 8))
    key = random.choice(list(active_devices.keys()))
    async with state_lock:
      current = active_devices[key]
      updated = mutate_device_state(key, current)
      active_devices[key] = updated
    await broadcast({"type": "update", "payload": {"device": key, "state": updated}})


async def apply_command(device: str, payload: Dict[str, Any]) -> DeviceState:
  async with state_lock:
    state = deepcopy(active_devices.get(device, DEVICE_TEMPLATES[device]))
    patched = mutate_from_command(state, payload)
    active_devices[device] = patched
  await broadcast({"type": "update", "payload": {"device": device, "state": patched}})
  return patched


def mutate_from_command(state: DeviceState, payload: Dict[str, Any]) -> DeviceState:
  updated = deepcopy(state)
  updated["updatedAt"] = iso_now()
  if "isOn" in payload:
    updated["isOn"] = bool(payload["isOn"])
  if "value" in payload and payload["value"] is not None:
    updated["value"] = payload["value"]
    if updated.get("unit") == "%" and isinstance(payload["value"], (int, float)):
      updated["status"] = f"Set to {int(payload['value'])}%"
  if "status" in payload and payload["status"]:
    updated["status"] = str(payload["status"])
  if "meta" in payload:
    meta = updated.setdefault("meta", {})
    meta.update(payload["meta"])
    if "locked" in payload["meta"]:
      locked = bool(payload["meta"]["locked"])
      updated["isOn"] = locked
      updated["status"] = "Door locked" if locked else "Door unlocked"
  if updated["key"] == "coffeeMaker" and updated.get("isOn"):
    updated.setdefault("meta", {})["lastBrew"] = iso_now()
    updated["status"] = "Brewing your custom roast"
  if updated["key"] == "music" and "value" in payload:
    track = updated.setdefault("meta", {}).get("track", "Custom Set")
    updated["status"] = f"Playing {track}"
  return updated


@app.on_event("startup")
async def on_startup() -> None:
  global simulator_task
  if simulator_task is None:
    simulator_task = asyncio.create_task(simulator_loop())


@app.on_event("shutdown")
async def on_shutdown() -> None:
  if simulator_task:
    simulator_task.cancel()
    with contextlib.suppress(asyncio.CancelledError):
      await simulator_task


@app.get("/health")
async def health() -> Dict[str, Any]:
  return {"status": "ok", "devices": len(active_devices), "connections": len(connections)}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
  await websocket.accept()
  connections.add(websocket)
  await send_snapshot(websocket)

  try:
    while True:
      message = await websocket.receive_json()
      if message.get("type") != "command":
        continue
      payload = message.get("payload", {})
      device = payload.get("device")
      state_payload = payload.get("state", {})
      if not device or device not in active_devices:
        await websocket.send_json(
          {
            "type": "error",
            "payload": {"message": f"Unknown device {device}"},
          }
        )
        continue
      patched = await apply_command(device, state_payload)
      await websocket.send_json(
        {
          "type": "ack",
          "payload": {"ok": True, "device": device, "state": patched},
        }
      )
  except WebSocketDisconnect:
    connections.discard(websocket)
  except Exception as exc:  # noqa: BLE001
    await websocket.close(code=1011, reason=str(exc))
    connections.discard(websocket)


if __name__ == "__main__":
  import contextlib
  import uvicorn

  uvicorn.run(
    "server:app",
    host="0.0.0.0",
    port=8000,
    reload=True,
    reload_includes=["server.py"],
  )
