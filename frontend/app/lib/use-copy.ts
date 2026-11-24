import { toast } from '@/ui/overlays/toast';
import { useCallback, useEffect, useRef, useState } from 'react';

import i18n from 'App/i18n';

/** Writes to the clipboard; falls back to execCommand where the async API is missing (http) or refused. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const prev = document.activeElement as HTMLElement | null;
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.focus();
    area.select();
    try {
      return document.execCommand('copy');
    } catch {
      return false;
    } finally {
      document.body.removeChild(area);
      prev?.focus?.();
    }
  }
}

/** Copies, then says how it went: `done` on success, a clipboard error otherwise. */
export async function copyWithToast(text: string, done: string) {
  if (await copyText(text)) toast.success(done);
  else toast.error(i18n.t('Could not reach the clipboard'));
}

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
      if (!(await copyText(text))) {
        toast.error(i18n.t('Could not reach the clipboard'));
        return;
      }
      setDone(true);
      if (timer.current != null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setDone(false), holdMs);
    },
    [holdMs],
  );

  return { copy, done };
}
