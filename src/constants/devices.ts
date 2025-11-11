import {
  LightBulbIcon,
  LockClosedIcon,
  MusicalNoteIcon,
  VideoCameraIcon,
  Cog6ToothIcon,
  BeakerIcon,
} from '@heroicons/react/24/solid';

export type DeviceKey =
  | 'lights'
  | 'ac'
  | 'doorLock'
  | 'camera'
  | 'coffeeMaker'
  | 'music';

export type DeviceControlType = 'toggle' | 'slider' | 'lock';

export interface DeviceBlueprint {
  key: DeviceKey;
  label: string;
  description: string;
  accent: string;
  gradient: string;
  icon: typeof LightBulbIcon;
  control: DeviceControlType;
  range?: {
    min: number;
    max: number;
    step?: number;
    unit?: string;
  };
}

export const DEVICE_BLUEPRINTS: Record<DeviceKey, DeviceBlueprint> = {
  lights: {
    key: 'lights',
    label: 'Luminous Lights',
    description: 'Adaptive mood lighting across the home',
    accent: 'text-accent',
    gradient: 'from-[#59C173]/70 via-[#a17fe0]/65 to-[#5D26C1]/70',
    icon: LightBulbIcon,
    control: 'slider',
    range: { min: 0, max: 100, step: 5, unit: '%' },
  },
  ac: {
    key: 'ac',
    label: 'Zen Climate',
    description: 'Precision temperature orchestration',
    accent: 'text-accent-soft',
    gradient: 'from-[#1FA2FF]/70 via-[#12D8FA]/65 to-[#A6FFCB]/70',
    icon: Cog6ToothIcon,
    control: 'slider',
    range: { min: 16, max: 30, step: 1, unit: '°C' },
  },
  doorLock: {
    key: 'doorLock',
    label: 'Sentinel Lock',
    description: 'Biometric-secured front entry',
    accent: 'text-accent-warm',
    gradient: 'from-[#FF9A9E]/75 via-[#fad0c4]/65 to-[#fad0c4]/75',
    icon: LockClosedIcon,
    control: 'lock',
  },
  camera: {
    key: 'camera',
    label: 'Halo Vision',
    description: 'Live 8K security feed',
    accent: 'text-accent',
    gradient: 'from-[#43cea2]/70 to-[#185a9d]/70',
    icon: VideoCameraIcon,
    control: 'toggle',
  },
  coffeeMaker: {
    key: 'coffeeMaker',
    label: 'Brew Maestro',
    description: 'Barista-grade espresso rituals',
    accent: 'text-accent-warm',
    gradient: 'from-[#FBD786]/75 via-[#f7797d]/70 to-[#C6FFDD]/60',
    icon: BeakerIcon,
    control: 'toggle',
  },
  music: {
    key: 'music',
    label: 'Pulse Audio',
    description: 'Spatial audio soundscapes',
    accent: 'text-accent-soft',
    gradient: 'from-[#fad0c4]/70 via-[#ffd1ff]/65 to-[#a1c4fd]/70',
    icon: MusicalNoteIcon,
    control: 'slider',
    range: { min: 0, max: 100, step: 10, unit: '%' },
  },
};

export const DEVICE_ORDER: DeviceKey[] = [
  'lights',
  'ac',
  'doorLock',
  'camera',
  'coffeeMaker',
  'music',
];
