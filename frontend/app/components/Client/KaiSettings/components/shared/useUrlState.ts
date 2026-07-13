import { useCallback, useEffect, useRef } from 'react';

import { useHistory, useLocation } from 'App/routing';

// Track a single URL query param — the shape the Activity page uses for `event_id`. Returns
// the current value (read natively from window.location.search) and a setter. The drawer/
// modal open state is DERIVED from this value (open iff present); there is NO separate React
// state syncing back to the URL, which is what created the back/forward feedback loop.
//
// `set(value, push)` writes through the router's history so it stays in sync: push=true adds
// a history entry (so the browser Back button closes the drawer), push=false replaces (used
// for close / tab, to not spam entries). The setter is reference-stable (key is constant per
// call site; history is read through a ref) so effects keyed on it can't re-fire on a bare
// navigation.
export function useQueryParam(
  key: string,
): [string | null, (value?: string | null, push?: boolean) => void] {
  // subscribe to location so the component re-renders on navigation (our writes + back/fwd)
  useLocation();
  const history = useHistory();
  const historyRef = useRef(history);
  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  const value = new URLSearchParams(window.location.search).get(key);

  const setParam = useCallback(
    (next?: string | null, push = false) => {
      const params = new URLSearchParams(window.location.search);
      if (next == null || next === '') params.delete(key);
      else params.set(key, next);
      const to = { search: params.toString() };
      if (push) historyRef.current.push(to);
      else historyRef.current.replace(to);
    },
    [key],
  );

  return [value, setParam];
}
