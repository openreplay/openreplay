import { useStore } from '@/mstore';
import { Tooltip } from '@/ui/overlays/tooltip';
import type { TFunction } from 'i18next';
import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { CompareTag } from 'App/components/Charts/CompareTag';
import 'App/components/Dashboard/charts.css';
import TopNButton from 'App/components/Dashboard/components/BreakdownFilter/TopNButton';
import { useModal } from 'App/components/Modal';
import type Funnel from 'App/mstore/types/funnel';
import type FunnelStage from 'App/mstore/types/funnelStage';
import type Widget from 'App/mstore/types/widget';
import NoDataInWindow from 'Components/Dashboard/components/NoDataInWindow';

interface Props {
  metric?: Widget;
  isWidget?: boolean;
  data: { funnel: Funnel; funnelBreakdown?: Record<string, Funnel> };
  compData?: { funnel: Funnel; funnelBreakdown?: Record<string, Funnel> };
}

const INSIDE_MIN = 12;
const fmt = (n: number) => (n ?? 0).toLocaleString();

export function stageText(stage: FunnelStage, t: TFunction): string {
  const subs = Array.isArray(stage.subfilters) ? stage.subfilters : [];
  if (subs.length) {
    const parts = subs.map((sf) =>
      sf.value?.length && sf.value[0]
        ? `${sf.name} ${sf.operator} ${sf.value.join(` ${t('or')} `)}`
        : sf.name,
    );
    return `${stage.label} ${t('where')} ${parts.join(` ${stage.propertyOrder || 'and'} `)}`;
  }
  if (stage.value?.length && stage.value[0]) {
    return `${stage.label} ${stage.operator} ${stage.value
      .map((v) => `"${String(v)}"`)
      .join(` ${t('or')} `)}`;
  }
  return stage.label;
}

function FunnelWidget({ metric, isWidget = false, data, compData }: Props) {
  const { t } = useTranslation();
  const { dashboardStore, metricStore } = useStore();
  const { hideModal } = useModal();
  // the drill-down filter outlives this component (a refetch remounts it):
  // start from the stage it still points at, so the next click clears it
  const [focusedFilter, setFocusedFilter] = React.useState<number | null>(
    () => {
      const n = dashboardStore.drillDownFilter.filters?.length ?? 0;
      return n > 0 ? n - 1 : null;
    },
  );
  const funnel = data?.funnel || ({ stages: [] } as unknown as Funnel);
  const stages = funnel.stages;
  const isUsers = metric?.metricFormat === 'userCount';
  const unit = isUsers ? t('users') : t('sessions');
  const horizontal = metric?.viewType === 'columnChart';
  const { drillDownFilter, drillDownPeriod } = dashboardStore;
  const comparisonPeriod = metric
    ? dashboardStore.comparisonPeriods[metric.metricId]
    : undefined;
  const metricFilters = metric?.series[0]?.filter.filters || [];
  const noEvents = metricFilters.length === 0;

  useEffect(
    () => () => {
      if (!isWidget) hideModal();
    },
    [],
  );

  // fresh stage objects after a refetch: mark the one still in focus
  useEffect(() => {
    if (focusedFilter == null) return;
    stages.forEach((s, i) => s.updateKey('isActive', i === focusedFilter));
  }, [stages]);

  const applyDrillDown = (index: number) => {
    const ts = drillDownPeriod.toTimestamps();
    drillDownFilter.merge({
      filters: metricFilters.slice(0, index + 1),
      startTimestamp: ts.startTimestamp,
      endTimestamp: ts.endTimestamp,
    });
  };

  const focusStage = (index: number) => {
    const clearing = focusedFilter === index;
    stages.forEach((s, i) =>
      s.updateKey('isActive', clearing ? true : i === index),
    );
    setFocusedFilter(clearing ? null : index);
    applyDrillDown(clearing ? -1 : index);
  };

  const topN = metricStore.breakdownTopN;
  const breakdown = data?.funnelBreakdown;
  const allBreakdownKeys = breakdown ? Object.keys(breakdown) : [];
  const breakdownKeys =
    topN > 0 ? allBreakdownKeys.slice(0, topN) : allBreakdownKeys;

  const compLabel = React.useMemo(() => {
    if (!comparisonPeriod) return t('Previous period');
    const ts = comparisonPeriod.toTimestamps?.() ?? comparisonPeriod;
    if (!ts.startTimestamp || !ts.endTimestamp) return t('Previous period');
    return `${new Date(ts.startTimestamp).toLocaleDateString()} – ${new Date(ts.endTimestamp).toLocaleDateString()}`;
  }, [comparisonPeriod]);

  if (stages.length === 0) {
    return noEvents ? (
      <p className="m-funnel__empty">
        {t('Select an event to start seeing the funnel.')}
      </p>
    ) : (
      <NoDataInWindow inGrid={isWidget} />
    );
  }

  const compact = isWidget && stages.length > 2;
  const shown = compact ? [0, stages.length - 1] : stages.map((_, i) => i);
  const hidden = compact ? stages.length - 2 : 0;
  const compStages = compData?.funnel?.stages;
  const compConversion = compData?.funnel?.totalConversionsPercentage;
  const delta =
    compConversion != null
      ? funnel.totalConversionsPercentage - compConversion
      : null;

  return (
    <div
      className={`m-fn${horizontal ? ' m-fn--columns' : ''}${compact ? ' is-compact' : ''}${isWidget ? ' is-inert' : ''}`}
    >
      <ol className="m-fn__stages">
        {shown.map((index, i) => {
          const s = stages[index];
          const share = s.completedPercentageTotal;
          const inside = share >= INSIDE_MIN;
          const label = stageText(s, t);
          const c = compStages?.[index];
          const parts = breakdown
            ? breakdownKeys
                .map((key) => ({
                  key,
                  count: breakdown[key]?.stages?.[index]?.count ?? 0,
                }))
                .filter((p) => p.count > 0)
            : null;
          const size = (pct: number) => ({
            [horizontal ? 'height' : 'width']: `${Math.max(2, pct)}%`,
          });
          const body = (
            <>
              <span className="m-fn__head">
                <span className="m-funnel__index">{index + 1}</span>
                <span className="m-fn__label m-truncate" title={label}>
                  {label}
                </span>
                <span className="m-fn__figs">
                  <span className="m-fn__count">{fmt(s.count)}</span>
                  {!inside && <span className="m-fn__pct">{share}%</span>}
                  {index > 0 && s.droppedCount > 0 && (
                    <span
                      className="m-fn__drop"
                      title={t(
                        '{{n}} {{unit}} did not reach this step · {{pct}}%',
                        {
                          n: fmt(s.droppedCount),
                          unit,
                          pct: s.droppedPercentage,
                        },
                      )}
                    >
                      −{fmt(s.droppedCount)}
                    </span>
                  )}
                </span>
              </span>
              <span className="m-fn__bars">
                <span className="m-fn__track" aria-hidden="true">
                  {parts && parts.length ? (
                    <span className="m-fn__parts" style={size(share)}>
                      {parts.map((p, k) => (
                        <span
                          key={p.key}
                          className="m-fn__part"
                          style={{
                            flex: p.count,
                            background: `var(--m-chart-${(k % 8) + 1})`,
                          }}
                          title={`${p.key}: ${fmt(p.count)}`}
                        />
                      ))}
                    </span>
                  ) : (
                    <span className="m-fn__fill" style={size(share)}>
                      {inside && <span className="m-fn__inside">{share}%</span>}
                    </span>
                  )}
                </span>
                {c ? (
                  <span
                    className="m-fn__ghost"
                    title={`${compLabel}: ${fmt(c.count)} ${unit} · ${c.completedPercentageTotal}%`}
                  >
                    <span
                      className="m-fn__ghost-fill"
                      style={size(c.completedPercentageTotal)}
                    />
                  </span>
                ) : null}
              </span>
            </>
          );
          const aria = t(
            'Step {{n}}, {{label}}: {{value}} {{unit}}, {{pct}}%',
            {
              n: index + 1,
              label,
              value: fmt(s.count),
              unit,
              pct: share,
            },
          );
          return (
            <li
              key={index}
              className={`m-fn__stage${focusedFilter === index ? ' is-focused' : ''}${s.isActive ? '' : ' is-muted'}`}
            >
              {i === 1 && hidden > 0 && (
                <span className="m-fn__more">
                  {hidden === 1
                    ? t('+1 step')
                    : t('+{{n}} steps', { n: hidden })}
                </span>
              )}
              {isWidget ? (
                <span
                  className="m-fn__stage-btn"
                  role="group"
                  aria-label={aria}
                >
                  {body}
                </span>
              ) : (
                <button
                  type="button"
                  className="m-fn__stage-btn"
                  aria-label={aria}
                  onClick={() => focusStage(index)}
                >
                  {body}
                </button>
              )}
            </li>
          );
        })}
      </ol>
      <footer className="m-fn__foot">
        <dl className="m-fn__stats">
          <div
            className="m-fn__stat"
            title={t('{{n}} {{unit}} reached the last step', {
              n: fmt(funnel.totalConversions),
              unit,
            })}
          >
            <dt>{t('Total conversion')}</dt>
            <dd>{funnel.totalConversionsPercentage}%</dd>
          </div>
          <div
            className="m-fn__stat"
            title={`${fmt(funnel.lostConversions)} ${unit}`}
          >
            <dt>{t('Lost conversion')}</dt>
            <dd>{funnel.lostConversionsPercentage}%</dd>
          </div>
          {compConversion != null && (
            <div className="m-fn__stat">
              <dt>{compLabel}</dt>
              <dd>
                {compConversion}%{delta ? <CompareTag delta={delta} /> : null}
              </dd>
            </div>
          )}
          {funnel.totalDropDueToIssues > 0 && (
            <div className="m-fn__stat">
              <dt>{t('Dropped due to issues')}</dt>
              <dd>
                <Tooltip title={unit}>
                  <span>{fmt(funnel.totalDropDueToIssues)}</span>
                </Tooltip>
              </dd>
            </div>
          )}
        </dl>
        {allBreakdownKeys.length > 0 && !isWidget ? (
          <TopNButton totalValues={allBreakdownKeys.length} />
        ) : null}
      </footer>
    </div>
  );
}

export default observer(FunnelWidget);
