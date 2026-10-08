import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

// longer than --m-duration-slow; a timer rather than animationend, which never
// fires under prefers-reduced-motion (the animation is switched off there)
const WAVE_MS = 700;

export function useWave(): { trigger: () => void; rings: ReactNode } {
  const [keys, setKeys] = useState<number[]>([]);
  const timers = useRef(new Set<number>());

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((id) => window.clearTimeout(id));
  }, []);

  const trigger = useCallback(() => {
    const k = performance.now();
    setKeys((cur) => [...cur, k]);
    const id = window.setTimeout(() => {
      timers.current.delete(id);
      setKeys((cur) => cur.filter((x) => x !== k));
    }, WAVE_MS);
    timers.current.add(id);
  }, []);

  const rings = keys.map((k) => (
    <span key={k} className="m-wave" aria-hidden="true" />
  ));

  return { trigger, rings };
}
