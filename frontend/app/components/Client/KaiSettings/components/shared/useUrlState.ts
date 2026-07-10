import { useCallback } from 'react';

import { useHistory, useLocation } from 'App/routing';

// Mirrors KaiSettings UI state (active tab, opened test/run) into the URL query string so a
// reload or shared link restores it. Each writer merges into the *live* query (reads
// window.location.search, not a render-time snapshot) so the tabs never clobber one
// another's params, and skips the write when nothing changed — no history spam, no loop.
// Uses history.replace({ search }) — the app's v5-compat idiom, which preserves the path.
export function useUrlState() {
  const location = useLocation();
  const history = useHistory();
  const params = new URLSearchParams(location.search);

  const get = (key: string): string | undefined => params.get(key) ?? undefined;

  const set = useCallback(
    (key: string, value?: string | null) => {
      const next = new URLSearchParams(window.location.search);
      if (value == null || value === '') next.delete(key);
      else next.set(key, value);
      const search = next.toString();
      if (search === window.location.search.replace(/^\?/, '')) return;
      history.replace({ search });
    },
    [history],
  );

  return { get, set };
}
