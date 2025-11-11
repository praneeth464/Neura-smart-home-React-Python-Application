import { useEffect, useState } from 'react';

const formatter = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});

export const useCurrentTime = () => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  return {
    now,
    readable: formatter.format(now),
  };
};

export default useCurrentTime;
