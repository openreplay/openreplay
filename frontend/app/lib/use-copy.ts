import { useCallback, useEffect, useRef, useState } from 'react';

export function useCopy(holdMs = 1600) {
  const [done, setDone] = useState(false);
  const timer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (timer.current != null) window.clearTimeout(timer.current);
    },
    [],
  );

  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const area = document.createElement('textarea');
        area.value = text;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        try {
          document.execCommand('copy');
        } finally {
          document.body.removeChild(area);
        }
      }
      setDone(true);
      if (timer.current != null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setDone(false), holdMs);
    },
    [holdMs],
  );

  return { copy, done };
}
