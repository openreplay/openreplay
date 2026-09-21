import React from 'react';
import { Button } from 'antd';
import { ArrowRight } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { sessions as sessionsRoute, withSiteId } from 'App/routes';
import { useHistory } from 'App/routing';
import { Loader, NoContent } from 'UI';

import { ISSUE_ERRORS, issueFilter } from '../DashboardMetrics/DashboardMetrics';

import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import SessionItem from 'Shared/SessionItem';

interface Props {
  siteId: string;
  limit?: number;
  /** Issue keys narrowing the list, e.g. ['js_exception']. Null shows everything. */
  issue?: string[] | null;
}

/**
 * Recent sessions, inline on the dashboard.
 *
 * The dashboard previously showed only aggregate cards, so the answer to "which
 * sessions is this about?" always lived on another screen. Showing them here keeps the
 * numbers and the sessions they describe on one page.
 */
function DashboardSessions({ siteId, limit = 6, issue = null }: Props) {
  const issueKey = (issue ?? []).join(',');
  const { t } = useTranslation();
  const { dashboardStore, sessionStore } = useStore();
  const history = useHistory();

  // `any` matches how SessionItem is consumed everywhere else in this codebase.
  const [sessions, setSessions] = React.useState<any[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);

  const { period } = dashboardStore;
  const range = period?.toTimestamps?.();

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    sessionStore
      .getSessions({
        filters: issue?.length ? [issueFilter(issue)] : [],
        sort: 'startTs',
        order: 'desc',
        eventsOrder: 'then',
        page: 1,
        limit,
        startTimestamp: range?.startTimestamp,
        endTimestamp: range?.endTimestamp,
      })
      .then((res: { sessions: any[]; total: number }) => {
        if (cancelled) return;
        setSessions(res.sessions ?? []);
        setTotal(res.total ?? 0);
      })
      .catch(() => {
        if (!cancelled) setSessions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range?.startTimestamp, range?.endTimestamp, limit, issueKey]);

  return (
    <div className="bg-white rounded-lg border border-gray-light">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-light">
        <div className="flex items-baseline gap-2">
          <h3 className="text-base font-medium">
            {!issue?.length
              ? t('Recent sessions')
              : issue.length > 1
                ? t('Sessions needing attention')
                : issue[0] === ISSUE_ERRORS
                  ? t('Sessions with errors')
                  : t('Sessions with rage clicks')}
          </h3>
          {total > 0 && (
            <span className="text-sm color-gray-medium">
              {t('of')} {total}
            </span>
          )}
        </div>
        <Button
          type="text"
          size="small"
          onClick={() => history.push(withSiteId(sessionsRoute(), siteId))}
        >
          <span className="flex items-center gap-1">
            {t('View all')}
            <ArrowRight size={14} />
          </span>
        </Button>
      </div>

      <Loader loading={loading} style={{ minHeight: 180 }}>
        <NoContent
          show={!sessions.length}
          title={
            <div className="flex flex-col items-center justify-center py-8">
              <AnimatedSVG name={ICONS.NO_RESULTS} size={60} />
              <div className="mt-3 text-base color-gray-medium">
                {issue?.length
                  ? t('No sessions match this filter.')
                  : t('No sessions in this period.')}
              </div>
            </div>
          }
        >
          <div className="divide-y divide-gray-light">
            {sessions.map((session: any) => (
              <div key={session.sessionId} className="px-4">
                <SessionItem session={session} />
              </div>
            ))}
          </div>
        </NoContent>
      </Loader>
    </div>
  );
}

export default observer(DashboardSessions);
