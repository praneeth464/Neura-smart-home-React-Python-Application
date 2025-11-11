import {
  HomeModernIcon,
  Squares2X2Icon,
  SparklesIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';

const NAV_ITEMS = [
  {
    id: 'home',
    label: 'Home',
    icon: HomeModernIcon,
    active: true,
  },
  {
    id: 'rooms',
    label: 'Rooms',
    icon: Squares2X2Icon,
    active: false,
  },
  {
    id: 'scenes',
    label: 'Scenes',
    icon: SparklesIcon,
    active: false,
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Cog6ToothIcon,
    active: false,
  },
];

const BottomNav = () => (
  <nav className="sticky bottom-5 left-0 right-0 mx-auto w-full max-w-md rounded-full border border-white/10 bg-card-glass px-4 py-3 backdrop-blur-2xl">
    <ul className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-frost-muted">
      {NAV_ITEMS.map(({ id, label, icon: Icon, active }) => (
        <li key={id}>
          <button
            type="button"
            className={clsx(
              'flex flex-col items-center gap-1 rounded-full px-3 py-2 transition',
              active
                ? 'bg-white/15 text-frost shadow-glass'
                : 'hover:bg-white/10',
            )}
          >
            <Icon className="h-5 w-5" />
            {label}
          </button>
        </li>
      ))}
    </ul>
  </nav>
);

export default BottomNav;
