import Dashboard from 'App/mstore/types/dashboard';
import Widget from 'App/mstore/types/widget';
import { dashboardService, metricService } from 'App/services';

/**
 * A project that already records sessions has everything needed to fill a dashboard,
 * so making the user assemble one from an empty grid is busywork. When a dashboard is
 * *created*, prefill it with a small, useful default set.
 *
 * Deliberately runs on creation rather than on view: seeding whenever a dashboard
 * happens to be empty would fight users who intentionally removed every card.
 *
 * Best-effort — if anything fails the dashboard is simply left empty and the normal
 * card picker takes over.
 */
const STARTER_CARDS = [
  {
    name: 'Sessions over time',
    metricType: 'timeseries',
    metricOf: 'sessionCount',
    viewType: 'lineChart',
  },
  { name: 'Top pages', metricType: 'table', metricOf: 'LOCATION', viewType: 'table' },
  { name: 'Countries', metricType: 'table', metricOf: 'userCountry', viewType: 'table' },
];

interface SeedDeps {
  /** Resolves to the number of sessions in the current period. */
  countSessions: () => Promise<number>;
}

export default async function seedStarterCards(
  dashboard: any,
  { countSessions }: SeedDeps,
): Promise<boolean> {
  try {
    // Nothing to draw in an empty project — leave the picker in place.
    const total = await countSessions();
    if (!total) return false;

    const metricIds: any[] = [];
    for (const card of STARTER_CARDS) {
      const widget = new Widget();
      widget.fromJson({
        ...card,
        // fromJson overwrites the model default with undefined when absent, and the
        // cards API rejects the request without it.
        metricFormat: 'sessionCount',
        metricValue: [],
        series: [{ name: card.name, filter: { filters: [], eventsOrder: 'then' } }],
      });
      const saved: any = await metricService.saveMetric(widget);
      const id = saved?.metricId ?? saved?.metric_id;
      if (id) metricIds.push(id);
    }

    if (!metricIds.length) return false;
    // `dashboardStore.save` resolves the raw API payload rather than a Dashboard
    // model, and addWidget needs `toJson()`. Wrap it if it isn't one already.
    const model =
      typeof dashboard?.toJson === 'function'
        ? dashboard
        : new Dashboard().fromJson(dashboard);
    await dashboardService.addWidget(model, metricIds);
    return true;
  } catch {
    return false;
  }
}
