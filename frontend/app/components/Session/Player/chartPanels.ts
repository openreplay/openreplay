import React from 'react';

/* The chart panels (X-Ray, Performance) carry echarts, ~230KB gz, and start
   closed: they load on demand instead of with the replay. */
const loadOverview = () => import('Components/Session_/OverviewPanel');
const loadPerformance = () => import('Components/Session_/Performance');

export const OverviewPanel = React.lazy(() =>
  loadOverview().then((m) => ({ default: m.OverviewPanel })),
);
export const MobileOverviewPanel = React.lazy(() =>
  loadOverview().then((m) => ({ default: m.MobileOverviewPanel })),
);
export const ConnectedPerformance = React.lazy(() =>
  loadPerformance().then((m) => ({ default: m.ConnectedPerformance })),
);
export const MobilePerformance = React.lazy(() =>
  loadPerformance().then((m) => ({ default: m.MobilePerformance })),
);

/** Warm both once the replay is idle, so opening a panel stays instant. */
export function usePrefetchChartPanels() {
  React.useEffect(() => {
    const warm = () => {
      void loadOverview();
      void loadPerformance();
    };
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(warm, { timeout: 5000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(warm, 2000);
    return () => window.clearTimeout(id);
  }, []);
}
