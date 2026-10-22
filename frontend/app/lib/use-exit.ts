import {
  type AnimationEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

// an exit that never runs (reduced motion, a hidden panel) never ends
const EXIT_FALLBACK_MS = 500;

/**
 * The value, kept for one exit animation after it goes: a panel that is plain
 * markup in the layout has nobody to keep it mounted while it slides out.
 */
export function useExit<T>(value: T | null | undefined): {
  shown: T | null;
  leaving: boolean;
  onAnimationEnd: (e: AnimationEvent<HTMLElement>) => void;
} {
  const [shown, setShown] = useState<T | null>(value ?? null);
  const latest = useRef(value);
  latest.current = value;
  if (value != null && value !== shown) setShown(value);
  const leaving = value == null && shown != null;

  const letGo = useCallback(() => {
    if (latest.current == null) setShown(null);
  }, []);

  useEffect(() => {
    if (!leaving) return;
    const t = window.setTimeout(letGo, EXIT_FALLBACK_MS);
    return () => window.clearTimeout(t);
  }, [leaving, letGo]);

  const onAnimationEnd = useCallback(
    (e: AnimationEvent<HTMLElement>) => {
      if (e.target === e.currentTarget) letGo();
    },
    [letGo],
  );

  return { shown, leaving, onAnimationEnd };
}
