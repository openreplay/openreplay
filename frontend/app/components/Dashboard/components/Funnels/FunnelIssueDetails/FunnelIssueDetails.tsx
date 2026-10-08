import { StatTile } from '@/ui/data/StatTile';
import { SkeletonRows } from '@/ui/feedback/SkeletonRows';
import { Tooltip } from '@/ui/overlays/tooltip';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';

import {
  SessionsTable,
  type SessionsTableProps,
} from 'Shared/SessionsTable/SessionsTable';
import { useOpenSession } from 'Shared/SessionsTable/useOpenSession';

import './funnel-issue.css';

interface Props {
  issueId: string;
}

/** A funnel issue: what it cost, how sessions split around it, and the sessions it hit. */
function FunnelIssueDetails({ issueId }: Props) {
  const { t } = useTranslation();
  const { dashboardStore, metricStore } = useStore();
  const { open, hover } = useOpenSession();
  const filter = dashboardStore.drillDownFilter;
  const widget = metricStore.instance;
  const [loading, setLoading] = useState(false);
  const [issue, setIssue] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);

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
                .filter((_: any, index: any) => {
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
        setIssue(resp.issue);
        setSessions(resp.sessions);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="px-6 py-5">
        <SkeletonRows rows={6} />
      </div>
    );
  }
  if (!issue) return null;

  const split = [
    {
      key: 'unaffected',
      label: t('Unaffected sessions'),
      n: issue.unaffectedSessions,
      pct: issue.unaffectedSessionsPer,
    },
    {
      key: 'affected',
      label: t('Affected sessions'),
      n: issue.affectedSessions,
      pct: issue.affectedSessionsPer,
    },
    {
      key: 'lost',
      label: t('Conversions lost'),
      n: issue.lostConversions,
      pct: issue.lostConversionsPer,
    },
  ];

  return (
    <>
      <div className="m-fissue">
        {issue.contextString && (
          <p className="m-fissue__context m-mono m-truncate">
            {issue.contextString}
          </p>
        )}
        <div className="m-fissue__tiles">
          <StatTile value={issue.affectedUsers} label={t('Affected users')} />
          <StatTile
            value={`${issue.conversionImpact}%`}
            label={t('Conversion impact')}
          />
          <StatTile
            value={issue.lostConversions}
            label={t('Lost conversions')}
          />
        </div>
        <div
          className="m-fissue__bar"
          role="img"
          aria-label={t('Session split')}
        >
          {split.map((s) => (
            <Tooltip key={s.key} title={`${s.label} · ${s.n}`}>
              <span
                className={`m-fissue__seg is-${s.key}`}
                style={{ width: `${s.pct}%` }}
              >
                {s.n}
              </span>
            </Tooltip>
          ))}
        </div>
        <div className="m-fissue__legend">
          {split.map((s) => (
            <span key={s.key}>
              <i className={`is-${s.key}`} aria-hidden="true" />
              {s.label}
            </span>
          ))}
        </div>
      </div>
      <SessionsTable
        rows={sessions as unknown as SessionsTableProps['rows']}
        fields={['started', 'duration', 'events', 'location', 'device']}
        onOpen={open}
        onHover={hover}
        liveBadge={false}
      />
    </>
  );
}

export default observer(FunnelIssueDetails);
