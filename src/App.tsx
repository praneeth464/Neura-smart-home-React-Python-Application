import { useCallback, useEffect, useMemo, useState } from 'react';
import TopBar from './components/TopBar';
import DeviceCard from './components/DeviceCard';
import BottomNav from './components/BottomNav';
import VoiceControlHint from './components/VoiceControlHint';
import {
  DEVICE_ORDER,
  DEVICE_BLUEPRINTS,
  type DeviceKey,
} from './constants/devices';
import useHomeStore, { type DeviceState } from './store/useHomeStore';
import { useHomeSocket } from './hooks/useHomeSocket';
import { useVoiceControl } from './hooks/useVoiceControl';
import fireEcoModeConfetti from './utils/confetti';

const applyThemeClass = (themePreference: string) => {
  if (typeof window === 'undefined') return;
  const prefersDark =
    window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true;
  const shouldDark =
    themePreference === 'dark' ||
    (themePreference === 'system' && prefersDark);
  document.documentElement.classList.toggle('dark', shouldDark);
};

function App() {
  const deviceKeys = useMemo(() => DEVICE_ORDER, []);
  const devices = useHomeStore((state) => state.devices);
  const connection = useHomeStore((state) => state.connection);
  const themePreference = useHomeStore((state) => state.themePreference);
  const setThemePreference = useHomeStore((state) => state.setThemePreference);
  const setWeather = useHomeStore((state) => state.setWeather);
  const weather = useHomeStore((state) => state.weather);
  const updateDevice = useHomeStore((state) => state.updateDevice);
  const ecoModeNotified = useHomeStore((state) => state.ecoModeNotified);
  const setEcoModeNotified = useHomeStore((state) => state.setEcoModeNotified);
  const [ecoBanner, setEcoBanner] = useState(false);

  const { sendCommand } = useHomeSocket();

  const commandDevice = useCallback(
    (deviceKey: DeviceKey, updates: Partial<DeviceState>) => {
      const current = devices[deviceKey];
      if (!current) return;
      const merged = {
        ...current,
        ...updates,
        meta: {
          ...current.meta,
          ...(updates.meta ?? {}),
        },
        updatedAt: new Date().toISOString(),
      };
      updateDevice(merged);
      sendCommand({
        device: deviceKey,
        state: {
          isOn: merged.isOn,
          value: merged.value,
          status: merged.status,
          meta: merged.meta,
        },
      });
    },
    [devices, sendCommand, updateDevice],
  );

  const { isSupported: voiceSupported } = useVoiceControl((command) => {
    const blueprint = DEVICE_BLUEPRINTS[command.device];
    commandDevice(command.device, {
      isOn:
        typeof command.state.isOn === 'boolean'
          ? command.state.isOn
          : devices[command.device].isOn,
      value:
        typeof command.state.value === 'number'
          ? Math.max(
              blueprint.range?.min ?? 0,
              Math.min(blueprint.range?.max ?? 100, command.state.value),
            )
          : devices[command.device].value,
      status:
        command.state.status ??
        (command.state.isOn ? 'Voice activated' : 'Voice standby'),
      meta: {
        ...devices[command.device].meta,
        ...command.state.meta,
      },
    });
  });

  useEffect(() => {
    applyThemeClass(themePreference);
    const onSystemChange = (event: MediaQueryListEvent) => {
      if (themePreference === 'system') {
        document.documentElement.classList.toggle('dark', event.matches);
      }
    };
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    media?.addEventListener('change', onSystemChange);
    return () => media?.removeEventListener('change', onSystemChange);
  }, [themePreference]);

  useEffect(() => {
    let cancelled = false;

    const fetchWeather = async (latitude: number, longitude: number) => {
      try {
        const params = new URLSearchParams({
          latitude: latitude.toString(),
          longitude: longitude.toString(),
          current: 'temperature_2m,is_day',
          timezone: 'auto',
        });
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
        );
        const data = await response.json();
        if (!cancelled) {
          setWeather({
            temperature: data?.current?.temperature_2m ?? 21,
            condition: data?.current?.is_day ? 'Sunny' : 'Night Sky',
            icon: data?.current?.is_day ? 'sun' : 'moon',
            location: 'HomeOne',
            updatedAt: new Date().toISOString(),
          });
        }
      } catch {
        if (!cancelled) {
          setWeather({
            temperature: 22,
            condition: 'Clear',
            icon: 'sun',
            location: 'HomeOne',
            updatedAt: new Date().toISOString(),
          });
        }
      }
    };

    const fallback = () => fetchWeather(37.7749, -122.4194);

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
        () => fallback(),
        { enableHighAccuracy: false, timeout: 5000 },
      );
    } else {
      fallback();
    }

    const interval = window.setInterval(fallback, 1000 * 60 * 15);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [setWeather]);

  const controllableKeys = deviceKeys.filter((key) => key !== 'doorLock');
  const allDevicesOff = controllableKeys.every((key) => {
    const device = devices[key];
    if (!device) return false;
    if (DEVICE_BLUEPRINTS[key].control === 'slider') {
      return (device.value ?? 0) <= (DEVICE_BLUEPRINTS[key].range?.min ?? 0);
    }
    return !device.isOn;
  });

  useEffect(() => {
    if (allDevicesOff && !ecoModeNotified && connection === 'connected') {
      fireEcoModeConfetti();
      setEcoModeNotified(true);
      setEcoBanner(true);
      const timer = window.setTimeout(() => setEcoBanner(false), 4000);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [allDevicesOff, connection, ecoModeNotified, setEcoModeNotified]);

  useEffect(() => {
    if (!allDevicesOff && ecoModeNotified) {
      setEcoModeNotified(false);
    }
  }, [allDevicesOff, ecoModeNotified, setEcoModeNotified]);

    const systemStatus =
      connection === 'connected'
        ? allDevicesOff
          ? 'Eco Mode Activated!'
          : 'All Good'
        : 'Reconnecting...';

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-gradient-to-br from-midnight via-aurora to-midnight text-frost">
      <div className="pointer-events-none fixed inset-0 bg-noise-light" />
      <main className="relative mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-5 pb-28 pt-8 md:px-10">
        <TopBar
          weather={weather}
          connection={connection}
          systemStatus={systemStatus}
          onThemeChange={setThemePreference}
          themePreference={themePreference}
        />

        {connection !== 'connected' && (
          <div className="rounded-3xl border border-yellow-400/30 bg-yellow-500/15 p-4 text-center text-sm text-yellow-100 backdrop-blur">
            Offline mode — showing your last known smart home state.
          </div>
        )}

        {ecoBanner && (
          <div className="rounded-3xl border border-emerald-400/40 bg-emerald-500/15 p-4 text-center text-sm text-emerald-200 shadow-glass">
            Eco mode activated! All devices are saving energy.
          </div>
        )}

        <section className="grid gap-5 pb-16 md:grid-cols-2 xl:grid-cols-3">
          {deviceKeys.map((deviceKey) => (
            <DeviceCard
              key={deviceKey}
              deviceKey={deviceKey}
              state={devices[deviceKey]}
              offline={connection !== 'connected'}
              onCommand={(command) =>
                commandDevice(command.device, {
                  isOn:
                    typeof command.state.isOn === 'boolean'
                      ? command.state.isOn
                      : devices[command.device].isOn,
                  value:
                    typeof command.state.value === 'number'
                      ? command.state.value
                      : devices[command.device].value,
                  status:
                    command.state.status ?? devices[command.device].status,
                  meta: {
                    ...devices[command.device].meta,
                    ...command.state.meta,
                  },
                })
              }
            />
          ))}
        </section>
      </main>
      <BottomNav />
      <VoiceControlHint
        visible={connection === 'connected'}
        supported={voiceSupported}
      />
    </div>
  );
}

export default App;
