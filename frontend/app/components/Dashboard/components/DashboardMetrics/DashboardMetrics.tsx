import React from 'react';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { Loader } from 'UI';

export const ISSUE_ERRORS = 'js_exception';
export const ISSUE_RAGE = 'click_rage';

interface Props {
  siteId: string;
  /** Issue keys currently narrowing the session list, or null for "everything". */
  activeFilter?: string[] | null;
  onFilter?: (issues: string[] | null) => void;
}

interface Stat {
  key: string;
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'default' | 'warn';
  /** null = clear the filter. Every card here is clickable by design. */
  issues: string[] | null;
}

export const issueFilter = (names: string[]) => ({
  value: names,
  operator: 'is',
  dataType: 'string',
  propertyOrder: 'and',
  filters: [],
  isEvent: false,
  name: 'issue',
  autoCaptured: true,
  isSegment: false,
});

const sameFilter = (a?: string[] | null, b?: string[] | null) =>
  (a ?? []).join(',') === (b ?? []).join(',');

/**
 * Core metrics for the dashboard. Deliberately not "sessions up 4%" vanity — these
 * answer two questions: is it recording, and is anything broken. Every card filters
 * the session list beside it, so the numbers and the sessions stay connected.
 */
function DashboardMetrics({ siteId, activeFilter = null, onFilter }: Props) {
  const { t } = useTranslation();
  const { dashboardStore, sessionStore } = useStore();
  const [stats, setStats] = React.useState<Stat[]>([]);
  const [loading, setLoading] = React.useState(true);

  const { period } = dashboardStore;
  const range = period?.toTimestamps?.();

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const base = {
      sort: 'startTs',
      order: 'desc',
      eventsOrder: 'then',
      page: 1,
      limit: 1,
      startTimestamp: range?.startTimestamp,
      endTimestamp: range?.endTimestamp,
    };
    const count = (filters: any[]) =>
      sessionStore
        .getSessions({ ...base, filters })
        .then((r: any) => r?.total ?? 0)
        .catch(() => 0);

    Promise.all([
      count([]),
      count([issueFilter([ISSUE_ERRORS])]),
      count([issueFilter([ISSUE_RAGE])]),
      count([issueFilter([ISSUE_ERRORS, ISSUE_RAGE])]),
    ])
      .then(([total, errors, rage, attention]) => {
        if (cancelled) return;
        setStats([
          {
            key: 'sessions',
            label: t('Sessions recorded'),
            value: total,
            hint: total ? t('Recording is working') : t('No sessions captured'),
            issues: null,
          },
          {
            key: 'attention',
            label: t('Need attention'),
            value: attention,
            hint:
              total > 0
                ? `${Math.round((attention / total) * 100)}% ${t('of sessions')}`
                : undefined,
            tone: attention > 0 ? 'warn' : 'default',
            issues: [ISSUE_ERRORS, ISSUE_RAGE],
          },
          {
            key: 'errors',
            label: t('Sessions with errors'),
            value: errors,
            tone: errors > 0 ? 'warn' : 'default',
            issues: [ISSUE_ERRORS],
          },
          {
            key: 'rage',
            label: t('Sessions with rage clicks'),
            value: rage,
            tone: rage > 0 ? 'warn' : 'default',
            issues: [ISSUE_RAGE],
          },
        ]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [range?.startTimestamp, range?.endTimestamp]);

  return (
    <Loader loading={loading} style={{ minHeight: 240 }}>
      <div className="flex flex-col gap-2">
        {stats.map((s) => {
          const isActive = sameFilter(activeFilter, s.issues);
          return (
            <button
              key={s.key}
              type="button"
              aria-pressed={isActive}
              onClick={() => onFilter?.(isActive ? null : s.issues)}
              className={[
                'w-full text-left bg-white rounded-lg border p-3 transition-colors',
                isActive ? 'border-main' : 'border-gray-light hover:border-main',
              ].join(' ')}
            >
              <div className="text-sm color-gray-medium">{s.label}</div>
              <div
                className={[
                  'text-2xl leading-none mt-1',
                  s.tone === 'warn' ? 'color-red' : '',
                ].join(' ')}
              >
                {s.value}
              </div>
              {s.hint ? (
                <div className="text-xs color-gray-medium mt-1">{s.hint}</div>
              ) : null}
            </button>
          );
        })}
      </div>
    </Loader>
  );
}

export default observer(DashboardMetrics);
