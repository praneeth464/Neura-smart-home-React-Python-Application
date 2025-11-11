import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { DEVICE_BLUEPRINTS, type DeviceKey } from '../constants/devices';

export interface DeviceState {
  key: DeviceKey;
  label: string;
  isOn: boolean;
  status: string;
  value?: number;
  unit?: string;
  meta?: Record<string, unknown>;
  updatedAt: string;
}

export interface WeatherSnapshot {
  temperature: number;
  condition: string;
  icon: string;
  location: string;
  updatedAt: string;
}

export type ConnectionState = 'connecting' | 'connected' | 'disconnected';

export type ThemePreference = 'system' | 'dark' | 'light';

interface HomeStore {
  devices: Record<DeviceKey, DeviceState>;
  connection: ConnectionState;
  lastUpdated: string | null;
  weather: WeatherSnapshot | null;
  themePreference: ThemePreference;
  voiceListening: boolean;
  ecoModeNotified: boolean;
  setDevices: (devices: Record<DeviceKey, DeviceState>) => void;
  updateDevice: (device: DeviceState) => void;
  setConnection: (state: ConnectionState) => void;
  setLastUpdated: (iso: string | null) => void;
  setWeather: (snapshot: WeatherSnapshot | null) => void;
  setThemePreference: (theme: ThemePreference) => void;
  setVoiceListening: (listening: boolean) => void;
  setEcoModeNotified: (value: boolean) => void;
  resetEcoCelebration: () => void;
}

const buildInitialDevices = (): Record<DeviceKey, DeviceState> => {
  const now = new Date().toISOString();
  return Object.entries(DEVICE_BLUEPRINTS).reduce(
    (acc, [key, blueprint]) => ({
      ...acc,
      [key as DeviceKey]: {
        key: key as DeviceKey,
        label: blueprint.label,
        isOn: key !== 'doorLock', // locked door counts as engaged
        status: 'Initializing...',
        value: blueprint.range ? blueprint.range.min : undefined,
        unit: blueprint.range?.unit,
        meta:
          key === 'doorLock'
            ? { locked: true }
            : key === 'camera'
              ? { recording: true }
              : {},
        updatedAt: now,
      },
    }),
    {} as Record<DeviceKey, DeviceState>,
  );
};

const initialState = {
  devices: buildInitialDevices(),
  connection: 'connecting' as ConnectionState,
  lastUpdated: null,
  weather: null,
  themePreference: 'system' as ThemePreference,
  voiceListening: false,
  ecoModeNotified: false,
};

const useHomeStore = create<HomeStore>()(
  persist(
    (set) => ({
      ...initialState,
      setDevices: (devices) =>
        set(() => ({
          devices,
        })),
      updateDevice: (device) =>
        set((state) => ({
          devices: {
            ...state.devices,
            [device.key]: {
              ...state.devices[device.key],
              ...device,
              updatedAt: device.updatedAt ?? new Date().toISOString(),
            },
          },
        })),
      setConnection: (connection) =>
        set(() => ({
          connection,
        })),
      setLastUpdated: (lastUpdated) =>
        set(() => ({
          lastUpdated,
        })),
      setWeather: (weather) =>
        set(() => ({
          weather,
        })),
      setThemePreference: (themePreference) =>
        set(() => ({
          themePreference,
        })),
      setVoiceListening: (voiceListening) =>
        set(() => ({
          voiceListening,
        })),
      setEcoModeNotified: (ecoModeNotified) =>
        set(() => ({
          ecoModeNotified,
        })),
      resetEcoCelebration: () =>
        set(() => ({
          ecoModeNotified: false,
        })),
    }),
    {
      name: 'homeone-state',
      storage: createJSONStorage(() => {
        if (typeof window === 'undefined') {
          return {
            getItem: () => null,
            setItem: () => undefined,
            removeItem: () => undefined,
          };
        }
        return window.localStorage;
      }),
      partialize: (state) => ({
        devices: state.devices,
        weather: state.weather,
        lastUpdated: state.lastUpdated,
        themePreference: state.themePreference,
      }),
    },
  ),
);

export const selectDevices = (state: HomeStore) => state.devices;
export const selectConnection = (state: HomeStore) => state.connection;
export const selectWeather = (state: HomeStore) => state.weather;
export const selectThemePreference = (state: HomeStore) =>
  state.themePreference;
export const selectVoiceListening = (state: HomeStore) =>
  state.voiceListening;

export default useHomeStore;
