import { QueryClient } from '@tanstack/react-query';

const SECOND = 1000;
const MINUTE = 60 * SECOND;

/**
 * The client was previously constructed with no options at all, which means
 * `staleTime: 0` — every remount refetched, and any screen whose cache had been
 * collected re-rendered its empty state first.
 *
 * The defaults below are stale-while-revalidate: a cached result renders
 * immediately and a refresh runs in the background. No component in the app
 * branches on `isFetching` (only `isPending` / `isLoading`), so a background
 * refresh never replaces content with a spinner — data is swapped in when it
 * lands.
 *
 * Note these defaults only govern react-query. The genuinely live screens —
 * the sessions list and Data Management's Activity page — are driven by mobx
 * stores with their own refresh intervals and are unaffected.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Long enough to absorb remounts from navigating away and back, short
      // enough that a returning user sees current data.
      staleTime: 30 * SECOND,
      // Keep results around well past staleTime so revisiting a screen renders
      // from cache while it revalidates, instead of from an empty state.
      gcTime: 10 * MINUTE,
      // This is an operator console that sits open in a background tab for
      // hours; refetching every screen on every focus is mostly noise.
      refetchOnWindowFocus: false,
      // Coming back from a dropped connection is different — that data really
      // is suspect.
      refetchOnReconnect: true,
      retry: 1,
      retryDelay: (attempt) => Math.min(SECOND * 2 ** attempt, 30 * SECOND),
    },
    mutations: {
      // Retrying a write without knowing whether the first attempt landed is
      // not safe to do by default.
      retry: 0,
    },
  },
});

/**
 * Spread into a `useQuery` call for data that must reflect the backend closely —
 * anything an operator watches change while they sit on the page.
 *
 * Still renders cached data first; it just always revalidates on mount and on
 * window focus rather than trusting the 30s window.
 */
export const liveQueryOptions = {
  staleTime: 0,
  refetchOnMount: 'always',
  refetchOnWindowFocus: true,
} as const;

export default queryClient;
