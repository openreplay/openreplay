import {
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useSyncExternalStore,
} from 'react';
import * as React from 'react';
import {
  useLocation as useRouterLocation,
  useNavigationType as useRouterNavigationType,
  Routes,
  UNSAFE_NavigationContext,
  UNSAFE_LocationContext,
  type Location,
  type NavigateOptions,
  type To,
} from 'react-router';

/**
 * Workaround for React Router v7 + React 19 excessive re-renders.
 *
 * BrowserRouter's internal location context updates ~40 times after a single
 * navigation, causing every useLocation() and useNavigate() consumer to
 * re-render repeatedly.
 *
 * This module uses useSyncExternalStore to completely decouple consumers from
 * React Router's context. A thin LocationSync component bridges the two worlds:
 * it re-renders ~40 times (unavoidable), but only pushes one update to the
 * external store per actual navigation (by comparing location.key).
 */

// ─── External location store ───────────────────────────────────────────
// Fully outside React's context system. Components subscribe via
// useSyncExternalStore, so only real changes trigger consumer re-renders.

type NavigationType = 'POP' | 'PUSH' | 'REPLACE';

let _location: Location = {
  pathname: window.location.pathname,
  search: window.location.search,
  hash: window.location.hash,
  state: window.history.state?.usr ?? null,
  key: window.history.state?.key ?? 'default',
  unstable_mask: undefined,
};

let _navigationType: NavigationType = 'POP';

const _listeners = new Set<() => void>();

function _subscribe(cb: () => void) {
  _listeners.add(cb);
  return () => _listeners.delete(cb);
}

function _getSnapshot(): Location {
  return _location;
}

function _getNavTypeSnapshot(): NavigationType {
  return _navigationType;
}

// ─── LocationSync ──────────────────────────────────────────────────────
// Thin bridge: subscribes to React Router's context (re-renders ~40× per
// nav) but only updates the external store once when the key changes.
// Place as a sibling inside BrowserRouter — it's a leaf (returns null).

export function LocationSync() {
  const routerLocation = useRouterLocation();
  const navigationType = useRouterNavigationType();

  // useLayoutEffect runs synchronously before browser paint, so consumers
  // re-render in the same frame — the user never sees stale UI.
  useLayoutEffect(() => {
    if (_location.key === routerLocation.key) return;
    _location = routerLocation;
    _navigationType = navigationType as NavigationType;
    for (const cb of _listeners) cb();
  });

  return null;
}

// ─── Stable hooks ──────────────────────────────────────────────────────

/**
 * Drop-in replacement for React Router's useLocation().
 * Only re-renders when the location key actually changes (once per nav).
 */
export function useStableLocation(): Location {
  return useSyncExternalStore(_subscribe, _getSnapshot, _getSnapshot);
}

/**
 * Drop-in replacement for React Router's useNavigationType().
 */
export function useStableNavigationType(): NavigationType {
  return useSyncExternalStore(
    _subscribe,
    _getNavTypeSnapshot,
    _getNavTypeSnapshot,
  );
}

/**
 * Drop-in replacement for React Router's useNavigate().
 * Does NOT subscribe to location context, so it never causes re-renders.
 * Uses UNSAFE_NavigationContext.navigator (the BrowserHistory instance)
 * directly — ref: https://github.com/remix-run/react-router/issues/7634
 */
export function useStableNavigate(): (
  to: To | number,
  options?: NavigateOptions,
) => void {
  const { navigator } = useContext(UNSAFE_NavigationContext) as any;

  return useCallback(
    (to: To | number, options?: NavigateOptions) => {
      if (typeof to === 'number') {
        navigator.go(to);
        return;
      }
      if (options?.replace) {
        navigator.replace(to, options.state);
      } else {
        navigator.push(to, options?.state);
      }
    },
    [navigator],
  );
}

// ─── StableRoutes ──────────────────────────────────────────────────────
// Wraps <Routes> in an overridden UNSAFE_LocationContext so that <Routes>
// and everything it renders subscribe to our stable location instead of
// the raw React Router context that fires ~40× per navigation.

export function StableRoutes({ children }: { children: React.ReactNode }) {
  const location = useStableLocation();
  const navigationType = useStableNavigationType();

  const locationCtx = useMemo(
    () => ({ location, navigationType }),
    [location, navigationType],
  );

  return (
    <UNSAFE_LocationContext.Provider value={locationCtx as any}>
      <Routes>{children}</Routes>
    </UNSAFE_LocationContext.Provider>
  );
}
