import { useCallback, useEffect, useRef } from 'react';
import useHomeStore, {
  type DeviceState,
  type ConnectionState,
} from '../store/useHomeStore';
import {
  DEVICE_BLUEPRINTS,
  type DeviceKey,
} from '../constants/devices';

interface ServerSnapshot {
  type: 'snapshot' | 'update' | 'ack' | 'error';
  payload: unknown;
}

interface SnapshotPayload {
  devices: Record<DeviceKey, DeviceState>;
  reportedAt?: string;
}

interface UpdatePayload {
  device: DeviceKey;
  state: DeviceState;
}

interface AckPayload {
  ok: boolean;
  device: DeviceKey;
  state: DeviceState;
}

export interface DeviceCommand {
  device: DeviceKey;
  state: {
    isOn?: boolean;
    value?: number;
    status?: string;
    meta?: Record<string, unknown>;
  };
}

const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8000/ws';
const MAX_BACKOFF = 8000;

const normaliseDevice = (device: DeviceState): DeviceState => {
  const fallback = DEVICE_BLUEPRINTS[device.key];
  return {
    key: device.key,
    label: device.label ?? fallback.label,
    isOn: device.isOn ?? false,
    status: device.status ?? 'Standing by',
    value:
      device.value ??
      (fallback.range ? Math.round((fallback.range.max + fallback.range.min) / 2) : undefined),
    unit: device.unit ?? fallback.range?.unit,
    meta: device.meta ?? {},
    updatedAt: device.updatedAt ?? new Date().toISOString(),
  };
};

const normaliseDevices = (
  devices: Record<DeviceKey, DeviceState>,
): Record<DeviceKey, DeviceState> =>
  Object.entries(devices).reduce(
    (acc, [key, value]) => ({
      ...acc,
      [key as DeviceKey]: normaliseDevice({
        ...value,
        key: key as DeviceKey,
      }),
    }),
    {} as Record<DeviceKey, DeviceState>,
  );

export const useHomeSocket = () => {
  const setDevices = useHomeStore((state) => state.setDevices);
  const updateDevice = useHomeStore((state) => state.updateDevice);
  const setConnection = useHomeStore((state) => state.setConnection);
  const setLastUpdated = useHomeStore((state) => state.setLastUpdated);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectDelay = useRef<number>(1000);
  const reconnectTimer = useRef<number | null>(null);

  const handleConnectionChange = useCallback(
    (state: ConnectionState) => {
      setConnection(state);
      if (state === 'connected') {
        reconnectDelay.current = 1000;
      }
    },
    [setConnection],
  );

  const handleMessage = useCallback(
    (event: MessageEvent<string>) => {
      try {
        const data: ServerSnapshot = JSON.parse(event.data);
        switch (data.type) {
          case 'snapshot': {
            const payload = data.payload as SnapshotPayload;
            setDevices(normaliseDevices(payload.devices));
            setLastUpdated(payload.reportedAt ?? new Date().toISOString());
            break;
          }
          case 'update': {
            const payload = data.payload as UpdatePayload;
            updateDevice(normaliseDevice(payload.state));
            setLastUpdated(payload.state.updatedAt ?? new Date().toISOString());
            break;
          }
          case 'ack': {
            const payload = data.payload as AckPayload;
            if (payload.ok) {
              updateDevice(normaliseDevice(payload.state));
              setLastUpdated(
                payload.state.updatedAt ?? new Date().toISOString(),
              );
            }
            break;
          }
          case 'error':
          default:
            console.error('HomeOne WS error payload', data.payload);
        }
      } catch (error) {
        console.error('HomeOne WS parse error', error);
      }
    },
    [setDevices, setLastUpdated, updateDevice],
  );

  const clearReconnectTimer = () => {
    if (reconnectTimer.current !== null) {
      window.clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
  };

  const connectSocket = useCallback(() => {
    clearReconnectTimer();
    if (socketRef.current) {
      socketRef.current.close();
    }
    handleConnectionChange('connecting');

    try {
      const socket = new WebSocket(WS_URL);
      socketRef.current = socket;

      socket.addEventListener('open', () => {
        handleConnectionChange('connected');
        socket.send(JSON.stringify({ type: 'hello', payload: 'homeone-app' }));
      });

      socket.addEventListener('message', handleMessage);

      socket.addEventListener('close', () => {
        handleConnectionChange('disconnected');
        reconnectDelay.current = Math.min(
          reconnectDelay.current * 1.5,
          MAX_BACKOFF,
        );
        reconnectTimer.current = window.setTimeout(() => {
          connectSocket();
        }, reconnectDelay.current);
      });

      socket.addEventListener('error', () => {
        socket.close();
      });
    } catch (error) {
      console.error('HomeOne WS connection error', error);
      reconnectDelay.current = Math.min(
        reconnectDelay.current * 1.5,
        MAX_BACKOFF,
      );
      reconnectTimer.current = window.setTimeout(() => {
        connectSocket();
      }, reconnectDelay.current);
    }
  }, [handleConnectionChange, handleMessage]);

  const sendCommand = useCallback((command: DeviceCommand) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      return false;
    }
    socketRef.current.send(
      JSON.stringify({
        type: 'command',
        payload: command,
      }),
    );
    return true;
  }, []);

  useEffect(() => {
    connectSocket();
    return () => {
      clearReconnectTimer();
      socketRef.current?.close();
    };
  }, [connectSocket]);

  return { sendCommand };
};

export default useHomeSocket;
