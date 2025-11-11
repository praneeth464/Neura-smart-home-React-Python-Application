import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import {
  DEVICE_BLUEPRINTS,
  type DeviceBlueprint,
  type DeviceKey,
} from '../constants/devices';
import type { DeviceState } from '../store/useHomeStore';
import type { DeviceCommand } from '../hooks/useHomeSocket';
import { formatRelativeTime } from '../utils/format';

interface DeviceCardProps {
  deviceKey: DeviceKey;
  state: DeviceState;
  onCommand: (command: DeviceCommand) => void;
  offline?: boolean;
}

const TogglePill = ({
  active,
  onClick,
  disabled,
  labelOn,
  labelOff,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  labelOn?: string;
  labelOff?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
      className={clsx(
        'relative h-9 w-20 rounded-full border border-white/20 bg-white/10 transition-all duration-300 ease-out',
        active ? 'bg-accent/80 shadow-glass' : 'bg-midnight/60 hover:bg-white/10',
        disabled && 'cursor-not-allowed opacity-60',
      )}
  >
    <span
      className={clsx(
        'absolute top-1/2 h-7 w-7 -translate-y-1/2 transform rounded-full bg-white shadow-lg transition-all duration-300',
        active ? 'translate-x-9' : 'translate-x-2',
      )}
    />
    <span className="sr-only">
      {active ? labelOn ?? 'On' : labelOff ?? 'Off'}
    </span>
  </button>
);

const LockToggle = ({
  locked,
  onUnlock,
  onLock,
  disabled,
}: {
  locked: boolean;
  onUnlock: () => void;
  onLock: () => void;
  disabled?: boolean;
}) => (
  <div className="flex gap-2">
    <button
      type="button"
      onClick={onLock}
      disabled={disabled}
      className={clsx(
        'rounded-full px-4 py-2 text-xs font-semibold transition-all',
        locked
          ? 'bg-white/80 text-midnight shadow-glass'
          : 'bg-white/10 text-frost hover:bg-white/20',
      )}
    >
      Lock
    </button>
    <button
      type="button"
      onClick={onUnlock}
      disabled={disabled}
      className={clsx(
        'rounded-full px-4 py-2 text-xs font-semibold transition-all',
        !locked
          ? 'bg-white/80 text-midnight shadow-glass'
          : 'bg-white/10 text-frost hover:bg-white/20',
      )}
    >
      Unlock
    </button>
  </div>
);

const renderControl = (
  blueprint: DeviceBlueprint,
  state: DeviceState,
  offline: boolean | undefined,
  onCommand: (command: DeviceCommand) => void,
  draftValue: number | undefined,
  setDraftValue: (value: number) => void,
) => {
  switch (blueprint.control) {
    case 'slider': {
      const range = blueprint.range ?? { min: 0, max: 100, step: 1, unit: '' };
      return (
        <div className="mt-2">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-frost-muted">
            <span>{range.unit ? `0${range.unit}` : 'min'}</span>
            <span>{range.unit ? `${range.max}${range.unit}` : 'max'}</span>
          </div>
          <input
            type="range"
            min={range.min}
            max={range.max}
            step={range.step ?? 1}
            value={draftValue ?? state.value ?? range.min}
            onChange={(event) => {
              const next = Number(event.target.value);
              setDraftValue(next);
            }}
            onPointerUp={(event) => {
              const next = Number((event.target as HTMLInputElement).value);
              onCommand({
                device: blueprint.key,
                state: {
                  value: next,
                  isOn: next > range.min,
                },
              });
            }}
            className="mt-2 w-full accent-accent-soft"
            disabled={offline}
          />
        </div>
      );
    }
    case 'lock': {
      const locked = state.meta?.locked ?? state.isOn;
      return (
        <LockToggle
          locked={Boolean(locked)}
          disabled={offline}
          onLock={() =>
            onCommand({
              device: blueprint.key,
              state: {
                isOn: true,
                status: 'Door secured',
                meta: { locked: true },
              },
            })
          }
          onUnlock={() =>
            onCommand({
              device: blueprint.key,
              state: {
                isOn: false,
                status: 'Door unlocked',
                meta: { locked: false },
              },
            })
          }
        />
      );
    }
    default:
      return (
        <TogglePill
          active={state.isOn}
          disabled={offline}
          labelOn={`${blueprint.label} on`}
          labelOff={`${blueprint.label} off`}
          onClick={() =>
            onCommand({
              device: blueprint.key,
              state: {
                isOn: !state.isOn,
                status: !state.isOn ? 'Activated' : 'Deactivated',
              },
            })
          }
        />
      );
  }
};

const DeviceCard = ({ deviceKey, state, onCommand, offline }: DeviceCardProps) => {
  const blueprint = DEVICE_BLUEPRINTS[deviceKey];
  const Icon = blueprint.icon;
  const [draftValue, setDraftValue] = useState<number | undefined>(
    state.value,
  );

  useEffect(() => {
    setDraftValue(state.value);
  }, [state.value]);

  const statusValue =
    blueprint.range && typeof (draftValue ?? state.value) === 'number'
      ? `${draftValue ?? state.value}${blueprint.range.unit ?? ''}`
      : state.status;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-card-glass p-[1px] shadow-glass backdrop-blur-md transition-transform duration-500 hover:-translate-y-1 hover:shadow-2xl">
      <div
        className={clsx(
          'absolute inset-0 opacity-80 blur-[60px]',
          `bg-gradient-to-br ${blueprint.gradient}`,
        )}
      />
      <div className="relative flex h-full flex-col gap-4 rounded-3xl bg-midnight/70 p-5 backdrop-blur-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.35em] text-frost-muted">
              <Icon className="h-4 w-4 text-accent" />
              {blueprint.label.split(' ')[0]}
            </div>
            <h3 className="mt-2 font-display text-2xl text-frost">
              {blueprint.label}
            </h3>
            <p className="mt-1 text-sm text-frost-muted">
              {blueprint.description}
            </p>
          </div>
          {blueprint.control === 'lock' ? null : (
            <TogglePill
              active={state.isOn}
              disabled={offline}
              onClick={() =>
                onCommand({
                  device: deviceKey,
                  state: {
                    isOn: !state.isOn,
                    status: !state.isOn ? 'Activated' : 'Deactivated',
                  },
                })
              }
            />
          )}
        </div>

        {renderControl(
          blueprint,
          state,
          offline,
          onCommand,
          draftValue,
          setDraftValue,
        )}

        <div className="mt-auto text-xs text-frost-muted">
          <div className="flex items-center justify-between">
            <span className="font-medium text-frost">
              {statusValue ?? state.status}
            </span>
            <span>{formatRelativeTime(state.updatedAt)}</span>
          </div>
          {offline && (
            <p className="mt-1 text-[11px] text-yellow-200/80">
              Offline mode · showing last known state
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeviceCard;
