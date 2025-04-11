import React, { useEffect, useState } from 'react';
import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';
import { Loader } from 'UI';
import SessionItem from 'App/components/shared/SessionItem/SessionItem';
import FunnelIssuesListItem from '../FunnelIssuesListItem';

interface Props {
  issueId: string;
}
function FunnelIssueDetails(props: Props) {
  const { dashboardStore, metricStore } = useStore();
  const { issueId } = props;
  const filter = useObserver(() => dashboardStore.drillDownFilter);
  const widget = useObserver(() => metricStore.instance);
  const [loading, setLoading] = useState(false);
  const [funnelIssue, setFunnelIssue] = useState<any>(null);
  const [sessions, setSessions] = useState<any>([]);

  useEffect(() => {
    setLoading(true);
    const _filters = {
      ...filter,
      series: widget.data.stages
        ? widget.series.map((item: any) => ({
            ...item,
            filter: {
              ...item.filter,
              filters: item.filter.filters
                .filter((filter: any, index: any) => {
                  const stage = widget.data.funnel.stages[index];
                  return stage && stage.isActive;
                })
                .map((f: any) => f.toJson()),
            },
          }))
        : [],
    };
    widget
      .fetchIssue(widget.metricId, issueId, _filters)
      .then((resp: any) => {
        setFunnelIssue(resp.issue);
        setSessions(resp.sessions);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <Loader loading={loading}>
      {funnelIssue && <FunnelIssuesListItem issue={funnelIssue} inDetails />}

      <div className="mt-6 bg-white p-3 rounded border">
        {sessions.map((session: any) => (
          <div key={session.id} className="border-b last:border-none">
            <SessionItem session={session} />
          </div>
        ))}
      </div>
    </Loader>
  );
}

export default FunnelIssueDetails;
