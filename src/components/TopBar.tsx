import { type ReactElement } from 'react';
import {
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  CloudIcon,
  ShieldCheckIcon,
  SignalIcon,
  NoSymbolIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import useHomeStore, {
  type WeatherSnapshot,
  type ThemePreference,
  type ConnectionState,
} from '../store/useHomeStore';
import { useCurrentTime } from '../hooks/useCurrentTime';

interface TopBarProps {
  weather: WeatherSnapshot | null;
  connection: ConnectionState;
  systemStatus: string;
  onThemeChange: (next: ThemePreference) => void;
  themePreference: ThemePreference;
}

const ThemeToggle = ({
  theme,
  onThemeChange,
}: {
  theme: ThemePreference;
  onThemeChange: (next: ThemePreference) => void;
}) => {
  const cycle = () => {
    const order: ThemePreference[] = ['system', 'dark', 'light'];
    const next = order[(order.indexOf(theme) + 1) % order.length];
    onThemeChange(next);
  };
  const iconMap: Record<ThemePreference, ReactElement> = {
    system: <ComputerDesktopIcon className="h-5 w-5" />,
    dark: <MoonIcon className="h-5 w-5" />,
    light: <SunIcon className="h-5 w-5" />,
  };
  const labelMap: Record<ThemePreference, string> = {
    system: 'Follow system',
    dark: 'Dark mode',
    light: 'Light mode',
  };

  return (
    <button
      type="button"
      onClick={cycle}
      className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-frost transition hover:bg-white/20"
    >
      {iconMap[theme]}
      {labelMap[theme]}
    </button>
  );
};

const TopBar = ({
  weather,
  connection,
  systemStatus,
  onThemeChange,
  themePreference,
}: TopBarProps) => {
  const { readable } = useCurrentTime();
  const voiceListening = useHomeStore((state) => state.voiceListening);

  return (
    <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-card-glass/80 p-6 backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-frost-muted">
            {systemStatus}
          </p>
          <h1 className="mt-1 font-display text-3xl text-frost">
            HomeOne Dashboard
          </h1>
        </div>
        <ThemeToggle theme={themePreference} onThemeChange={onThemeChange} />
      </div>

      <div className="grid gap-4 text-sm text-frost-muted md:grid-cols-3">
        <div className="flex items-center gap-3 rounded-2xl bg-white/5 px-4 py-3">
          <ShieldCheckIcon className="h-6 w-6 text-accent" />
          <div>
            <p className="text-frost text-sm font-semibold">Status</p>
            <p className="text-xs uppercase tracking-[0.25em] text-frost-muted">
              {systemStatus}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-white/5 px-4 py-3">
          <CloudIcon className="h-6 w-6 text-accent-soft" />
          {weather ? (
            <div>
              <p className="text-frost text-sm font-semibold">
                {weather.temperature.toFixed(0)}°
              </p>
              <p className="text-xs uppercase tracking-[0.25em] text-frost-muted">
                {weather.condition} · {weather.location}
              </p>
            </div>
          ) : (
            <div>
              <p className="text-frost text-sm font-semibold">Loading sky...</p>
              <p className="text-xs uppercase tracking-[0.25em] text-frost-muted">
                {readable}
              </p>
            </div>
          )}
        </div>
        <div
          className={clsx(
            'flex items-center gap-3 rounded-2xl px-4 py-3',
            connection === 'connected'
              ? 'bg-emerald-400/10'
              : 'bg-yellow-400/10',
          )}
        >
          {connection === 'connected' ? (
            <SignalIcon className="h-6 w-6 text-emerald-300" />
          ) : (
            <NoSymbolIcon className="h-6 w-6 text-yellow-200" />
          )}
          <div>
            <p className="text-frost text-sm font-semibold">
              {connection === 'connected' ? 'Live' : 'Reconnecting'}
            </p>
            <p className="text-xs uppercase tracking-[0.25em] text-frost-muted">
              {readable}
            </p>
          </div>
        </div>
      </div>

      {voiceListening && (
        <div className="flex items-center justify-center rounded-2xl border border-accent/30 bg-accent/10 py-3 text-sm text-accent">
          Listening... release space to send command
        </div>
      )}
    </header>
  );
};

export default TopBar;
