const relativeFormatter = new Intl.RelativeTimeFormat(undefined, {
  numeric: 'auto',
});

export const formatRelativeTime = (iso: string | undefined): string => {
  if (!iso) return 'just now';

  const diffMs = new Date(iso).getTime() - Date.now();
  const diffSec = Math.round(diffMs / 1000);

  const divisions: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, 'seconds'],
    [60, 'minutes'],
    [24, 'hours'],
    [7, 'days'],
    [4.34524, 'weeks'],
    [12, 'months'],
    [Number.POSITIVE_INFINITY, 'years'],
  ];

  let duration = diffSec;
  for (const [divisor, unit] of divisions) {
    if (Math.abs(duration) < divisor) {
      return relativeFormatter.format(duration, unit);
    }
    duration = Math.round(duration / divisor);
  }
  return 'just now';
};

export const formatTemperature = (value?: number, unit = '°C') =>
  typeof value === 'number' ? `${value.toFixed(0)}${unit}` : '—';

export default {
  formatRelativeTime,
  formatTemperature,
};
