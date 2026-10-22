import { IconButton } from '@/ui/actions/IconButton';
import { Button } from '@/ui/actions/button';
import { Notice } from '@/ui/feedback/Notice';
import { MultiSelect } from '@/ui/inputs/multi-select';
import { InlineSelect, SimpleSelect } from '@/ui/inputs/select';
import { Tooltip } from '@/ui/overlays/tooltip';
import { FilterCategory, FilterKey } from 'Types/filter/filterType';
import { eventKeys } from 'Types/filter/newFilter';
import { ChevronsDownUp, ChevronsUpDown, Plus, X } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import {
  ERRORS,
  FUNNEL,
  HEATMAP,
  INSIGHTS,
  RETENTION,
  TABLE,
  TIMESERIES,
  USER_PATH,
  WEBVITALS,
} from 'App/constants/card';
import { issueCategories } from 'App/constants/filterOptions';
import { filterStore, projectStore, useStore } from 'App/mstore';
import FilterSeries from 'Components/Dashboard/components/FilterSeries/FilterSeries';

export const supportsBreakdown = (metric: { metricType: string }) =>
  [TIMESERIES, FUNNEL, TABLE].includes(metric.metricType);

export function checkIsSingleSeries(metric: { metricType: string }) {
  const isTable = metric.metricType === TABLE;
  const isHeatMap = metric.metricType === HEATMAP;
  const isFunnel = metric.metricType === FUNNEL;
  const isInsights = metric.metricType === INSIGHTS;
  const isPathAnalysis = metric.metricType === USER_PATH;
  const isRetention = metric.metricType === RETENTION;
  const isWebVitals = metric.metricType === WEBVITALS;

  const isSingleSeries =
    isTable ||
    isFunnel ||
    isHeatMap ||
    isInsights ||
    isRetention ||
    isPathAnalysis ||
    isWebVitals;

  return isSingleSeries;
}

const getExcludedKeys = (metricType: string) => {
  switch (metricType) {
    case USER_PATH:
    case HEATMAP:
      return eventKeys;
    default:
      return [];
  }
};

const getExcludedCategories = (metricType: string) => {
  switch (metricType) {
    case USER_PATH:
    case FUNNEL:
      return [FilterCategory.DEVTOOLS];
    default:
      return [];
  }
};

function WidgetFormNew({ layout }: { layout: string }) {
  const { metricStore } = useStore();
  const metric: any = metricStore.instance;
  const excludeFilterKeys = getExcludedKeys(metric.metricType);
  const excludeCategory = getExcludedCategories(metric.metricType);

  const isPredefined = metric.metricType === ERRORS;

  return isPredefined ? (
    <PredefinedMessage />
  ) : (
    <div className="m-cardp__definition">
      <AdditionalFilters />
      <FilterSection
        layout={layout}
        metric={metric}
        excludeCategory={excludeCategory}
        excludeFilterKeys={excludeFilterKeys}
      />
    </div>
  );
}

export default observer(WidgetFormNew);

const FilterSection = observer(
  ({ layout, metric, excludeFilterKeys, excludeCategory }: any) => {
    const isTable = metric.metricType === TABLE;
    const isHeatMap = metric.metricType === HEATMAP;
    const isFunnel = metric.metricType === FUNNEL;
    const isInsights = metric.metricType === INSIGHTS;
    const isPathAnalysis = metric.metricType === USER_PATH;
    const isWebVitals = metric.metricType === WEBVITALS;
    const canAddSeries = metric.series.length < 3;

    const isSingleSeries = checkIsSingleSeries(metric);
    const { t } = useTranslation();
    const allOpen = isSingleSeries || layout.startsWith('flex-row');
    const defaultClosed = React.useRef(!allOpen && metric.exists());
    const [seriesCollapseState, setSeriesCollapseState] = React.useState<
      Record<number, boolean>
    >({});

    React.useEffect(() => {
      const defaultSeriesCollapseState: Record<number, boolean> = {};
      metric.series.forEach((s: any) => {
        defaultSeriesCollapseState[s.seriesId] = isTable
          ? false
          : allOpen
            ? false
            : defaultClosed.current;
      });
      setSeriesCollapseState(defaultSeriesCollapseState);
    }, [metric.series]);

    const collapseAll = () => {
      setSeriesCollapseState((seriesCollapseState) => {
        const newState = { ...seriesCollapseState };
        Object.keys(newState).forEach((key) => {
          newState[key] = true;
        });
        return newState;
      });
    };
    const expandAll = () => {
      setSeriesCollapseState((seriesCollapseState) => {
        const newState = { ...seriesCollapseState };
        Object.keys(newState).forEach((key) => {
          newState[key] = false;
        });
        return newState;
      });
    };

    const allCollapsed = Object.values(seriesCollapseState).every((v) => v);
    const lead = isPathAnalysis
      ? t('Filter the sessions')
      : isFunnel
        ? t('Add the first step')
        : isTable
          ? t('Filter the sessions')
          : t('Add an event to count');
    return (
      <>
        <div className="m-cardp__form">
          {metric.series
            .slice(0, isSingleSeries ? 1 : metric.series.length)
            .map((series: any, index: number) => (
              <FilterSeries
                key={series.seriesId ?? series.name}
                removeEvents={isPathAnalysis}
                excludeCategory={excludeCategory}
                observeChanges={() => metric.updateKey('hasChanged', true)}
                hideHeader={isSingleSeries}
                excludeEventOrder={isFunnel || isWebVitals || isHeatMap}
                seriesIndex={index}
                series={series}
                seriesNames={metric.series.map((s: any) => s.name)}
                onRemoveSeries={() => metric.removeSeries(index)}
                canDelete={metric.series.length > 1}
                collapseState={seriesCollapseState[series.seriesId]}
                onToggleCollapse={() =>
                  setSeriesCollapseState((state) => ({
                    ...state,
                    [series.seriesId]: !state[series.seriesId],
                  }))
                }
                lead={lead}
              />
            ))}
          {isSingleSeries ? null : (
            <div className="m-cardp__form-foot">
              <Tooltip
                title={
                  canAddSeries
                    ? t('Compare another set of events on the same chart')
                    : t('Maximum of 3 series reached.')
                }
              >
                <span>
                  <Button
                    variant="secondary"
                    className="m-cardp__addseries"
                    disabled={!canAddSeries}
                    onClick={() => metric.addSeries()}
                  >
                    <Plus size={13} />
                    {t('Add series')}
                  </Button>
                </span>
              </Tooltip>
              {metric.series.length > 1 ? (
                <IconButton
                  icon={
                    allCollapsed ? (
                      <ChevronsUpDown size={14} />
                    ) : (
                      <ChevronsDownUp size={14} />
                    )
                  }
                  label={
                    allCollapsed
                      ? t('Expand all series')
                      : t('Collapse all series')
                  }
                  variant="ghost"
                  onClick={allCollapsed ? expandAll : collapseAll}
                />
              ) : null}
            </div>
          )}
        </div>
      </>
    );
  },
);

const AUTO = '__auto';

/** a page rule's pages: its default property's values, else its own */
const pagesOf = (rule: any): string[] =>
  (
    (rule?.filters ?? []).find((p: any) => p.value?.some(Boolean))?.value ??
    rule?.value ??
    []
  ).filter(Boolean);

/** a LOCATION rule for `pages`, the value on its default property (url_path) */
async function pageRule(pages: string[]) {
  const ev: any = filterStore.findEvent({
    name: FilterKey.LOCATION,
    autoCaptured: true,
  });
  if (!ev) return null;
  const props = await filterStore.getEventFilters(ev.id);
  const path = (props ?? []).find((p: any) => p.defaultProperty);
  return {
    ...ev,
    operator: 'is',
    value: path ? [] : pages,
    filters: path
      ? [{ ...path, operator: 'is', value: pages, eventName: ev.name }]
      : [],
  };
}

/** One sentence read down a column: Starts at, Showing, Leaving out. */
const PathAnalysisFilter = observer(({ metric, writeOption }: any) => {
  const { t } = useTranslation();
  const metricValueOptions = [
    { value: 'location', label: t('Page paths') },
    { value: 'title', label: t('Page titles') },
    { value: 'click', label: t('Clicks') },
    { value: 'input', label: t('Inputs') },
    { value: 'custom', label: t('Events') },
  ];
  const fromEnd = metric.startType === 'end';
  // the pages this journey draws, in column order
  const nodes: any[] = metric.data?.nodes ?? [];
  const steps = useMemo(
    () => [
      ...new Set(
        nodes
          .filter((n) => n.eventType === 'LOCATION' && n.name)
          .sort((a, b) => (a.depth ?? 0) - (b.depth ?? 0))
          .map((n) => n.name as string),
      ),
    ],
    [nodes],
  );
  const start = pagesOf(metric.startPoint)[0] ?? null;
  const auto = nodes.find((n) => n.startingNode && n.name)?.name;
  const excluded = [
    ...new Set<string>(metric.excludes.flatMap((r: any) => pagesOf(r))),
  ];

  const setStart = async (v?: string) => {
    if (!v || v === AUTO) {
      metric.updateKey('startPoint', null);
      metric.updateKey('hasChanged', true);
      return;
    }
    const rule = await pageRule([v]);
    if (rule) metric.updateStartPoint(rule);
  };
  const setExcluded = async (next: string[]) => {
    if (!next.length) return metric.updateExcludes([]);
    const rule = await pageRule(next);
    if (rule) metric.updateExcludes([rule]);
  };

  const startOptions = [
    { value: AUTO, label: t('Most common page') },
    ...(start && !steps.includes(start) ? [start, ...steps] : steps).map(
      (p) => ({ value: p, label: p }),
    ),
  ];
  const leaveOptions = [
    ...excluded.filter((p) => !steps.includes(p)),
    ...steps,
  ].map((p) => ({
    value: p,
    label: <span className="m-mono m-truncate">{p}</span>,
    text: p,
  }));

  return (
    <div className="m-jrny">
      <div className="m-jrny__grid">
        <InlineSelect<'start' | 'end'>
          className="m-jrny__lead"
          value={metric.startType || 'start'}
          onChange={(value) =>
            writeOption({ name: 'startType', value: { value } })
          }
          ariaLabel={t('Start or end point')}
          options={[
            {
              value: 'start',
              label: t('Starts at'),
              hint: t('Where sessions go from here'),
            },
            {
              value: 'end',
              label: t('Ends at'),
              hint: t('How sessions arrived here'),
            },
          ]}
        />
        <div className="m-jrny__ctl">
          <SimpleSelect<string>
            className="m-jrny__field"
            value={start ?? AUTO}
            onChange={(v) => void setStart(v)}
            ariaLabel={fromEnd ? t('End page') : t('Start page')}
            options={startOptions}
          />
          {start == null && auto ? (
            <p className="m-jrny__note">
              {fromEnd
                ? t('Most sessions end on {{page}}', { page: auto })
                : t('Most sessions start on {{page}}', { page: auto })}
            </p>
          ) : null}
        </div>

        <span className="m-jrny__word">{t('Showing')}</span>
        <div className="m-jrny__ctl">
          <MultiSelect<string>
            className="m-jrny__field"
            value={metric.metricValue || []}
            onChange={(value) =>
              writeOption({
                name: 'metricValue',
                value: value.length ? value : ['location'],
              })
            }
            ariaLabel={t('What the steps are')}
            options={metricValueOptions}
          />
        </div>

        <span className="m-jrny__word">{t('Leaving out')}</span>
        <div className="m-jrny__ctl">
          <MultiSelect<string>
            className="m-jrny__field"
            value={excluded}
            onChange={(next) => void setExcluded(next)}
            ariaLabel={t('Pages to leave out of the journey')}
            placeholder={t('Nothing')}
            options={leaveOptions}
            searchable={{
              placeholder: t('Search pages'),
              empty: t('No page matches that.'),
            }}
          />
          {excluded.length > 0 && (
            <ul className="m-jrny__out" aria-label={t('Pages left out')}>
              {excluded.map((p) => (
                <li key={p}>
                  <span className="m-jrny__outname m-mono m-truncate">{p}</span>
                  <Tooltip title={t('Put this page back')}>
                    <button
                      type="button"
                      className="m-jrny__outx"
                      aria-label={t('Put {{page}} back in the journey', {
                        page: p,
                      })}
                      onClick={() =>
                        void setExcluded(excluded.filter((x) => x !== p))
                      }
                    >
                      <X size={11} aria-hidden="true" />
                    </button>
                  </Tooltip>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
});

const InsightsFilter = observer(({ metric, writeOption }: any) => {
  const { t } = useTranslation();
  return (
    <div className="m-jrny">
      <div className="m-jrny__grid">
        <span className="m-jrny__word">{t('Issue categories')}</span>
        <div className="m-jrny__ctl">
          <MultiSelect<string>
            className="m-jrny__field"
            value={metric.metricValue || []}
            onChange={(value) => writeOption({ name: 'metricValue', value })}
            ariaLabel={t('Issue categories')}
            placeholder={t('All categories')}
            options={issueCategories.map((c: any) => ({
              value: c.value,
              label: c.label,
            }))}
          />
        </div>
      </div>
    </div>
  );
});

const AdditionalFilters = observer(() => {
  const { metricStore } = useStore();
  const metric: any = metricStore.instance;

  const writeOption = ({ value, name }: { value: any; name: any }) => {
    value = Array.isArray(value) ? value : value.value;
    const obj: any = { [name]: value };
    metricStore.merge(obj);
  };

  return (
    <>
      {metric.metricType === USER_PATH && (
        <PathAnalysisFilter metric={metric} writeOption={writeOption} />
      )}
      {metric.metricType === INSIGHTS && (
        <InsightsFilter metric={metric} writeOption={writeOption} />
      )}
    </>
  );
});

const PredefinedMessage = () => {
  const { t } = useTranslation();
  return (
    <Notice kind="info">
      {t("Drilldown or filtering isn't supported on this legacy card.")}
    </Notice>
  );
};
