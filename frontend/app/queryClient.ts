import { QueryClient } from '@tanstack/react-query';

const SECOND = 1000;
const MINUTE = 60 * SECOND;

/**
 * Stale-while-revalidate defaults. Safe because nothing in the app branches on
 * `isFetching` (only `isPending` / `isLoading`), so a background refresh never
 * swaps content for a spinner.
 *
 * These govern react-query only — the live screens (sessions list, Data
 * Management's Activity page) run on mobx stores with their own intervals.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * SECOND,
      // Well past staleTime, so revisiting a screen renders from cache while it
      // revalidates rather than from an empty state.
      gcTime: 10 * MINUTE,
      // An operator console sits open in a background tab for hours; refetching
      // every screen on every focus is mostly noise. A dropped connection is
      // different — that data really is suspect.
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 1,
      retryDelay: (attempt) => Math.min(SECOND * 2 ** attempt, 30 * SECOND),
    },
    mutations: {
      // Not safe to retry a write without knowing whether the first landed.
      retry: 0,
    },
  },
});

/**
 * Spread into a `useQuery` that must track the backend closely. Still renders
 * cached data first, but always revalidates instead of trusting the 30s window.
 */
export const liveQueryOptions = {
  staleTime: 0,
  refetchOnMount: 'always',
  refetchOnWindowFocus: true,
} as const;

export default queryClient;
