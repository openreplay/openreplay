import { useRef } from 'react';

export function useLast<T>(value: T | null | undefined): T | null {
  const last = useRef<T | null>(null);
  if (value != null) last.current = value;
  return value ?? last.current;
}
