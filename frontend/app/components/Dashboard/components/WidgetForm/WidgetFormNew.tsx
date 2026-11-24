import { IconButton } from '@/ui/actions/IconButton';
import { Button } from '@/ui/actions/button';
import { Notice } from '@/ui/feedback/Notice';
import { MultiSelect } from '@/ui/inputs/multi-select';
import { Segmented } from '@/ui/inputs/toggle-group';
import { Tooltip } from '@/ui/overlays/tooltip';
import { FilterCategory, FilterKey } from 'Types/filter/filterType';
import { eventKeys } from 'Types/filter/newFilter';
import { ChevronsDownUp, ChevronsUpDown, Plus } from 'lucide-react';
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
import { useStore } from 'App/mstore';
import type { Filter } from 'App/mstore/types/filterConstants';
import FilterItem from 'App/mstore/types/filterItem';
import BreakdownFilter from 'Components/Dashboard/components/BreakdownFilter/BreakdownFilter';
import FilterSeries from 'Components/Dashboard/components/FilterSeries/FilterSeries';

import {
  type FilterTarget,
  RuleChips,
  type SearchFilter,
  ValueHintsContext,
  buildFilterEditor,
  seriesTarget,
  useCatalogue,
} from 'Shared/FilterEditor';

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
      {/* a journey's session filters are the last row of its sentence */}
      {metric.metricType !== USER_PATH && (
        <FilterSection
          layout={layout}
          metric={metric}
          excludeCategory={excludeCategory}
          excludeFilterKeys={excludeFilterKeys}
        />
      )}
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
    // keyed by the series itself: unsaved series have no seriesId yet
    const [collapsed, setCollapsed] = React.useState<ReadonlySet<object>>(
      () =>
        new Set(
          !allOpen && metric.exists() && metric.series.length > 1
            ? metric.series
            : [],
        ),
    );
    const toggle = (series: object) =>
      setCollapsed((prev) => {
        const next = new Set(prev);
        if (!next.delete(series)) next.add(series);
        return next;
      });
    const collapseAll = () => setCollapsed(new Set(metric.series));
    const expandAll = () => setCollapsed(new Set());

    const allCollapsed = metric.series.every((s: object) => collapsed.has(s));
    const many = !isSingleSeries && metric.series.length > 1;
    const lead = isFunnel
      ? t('Add the first step')
      : isHeatMap || isWebVitals
        ? t('Add the page')
        : t('Add an event or filter');
    const heading = isFunnel
      ? t('Steps')
      : isHeatMap || isWebVitals
        ? t('Page')
        : isTable
          ? t('Filters')
          : t('Events');
    const breakdown = supportsBreakdown(metric);
    return (
      <div className="m-defs">
        <div className={`m-defs__groups${breakdown ? ' has-two' : ''}`}>
          <section
            className="m-defs__group"
            aria-label={isSingleSeries ? heading : t('Series')}
          >
            {isSingleSeries ? (
              <h4 className="m-defs__head">{heading}</h4>
            ) : null}
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
                  many={many}
                  collapseState={collapsed.has(series)}
                  onToggleCollapse={() => toggle(series)}
                  lead={lead}
                />
              ))}
            {isSingleSeries ? null : (
              <div className="m-defs__foot">
                <Tooltip
                  title={
                    canAddSeries
                      ? t('Compare another set of events on the same chart')
                      : t('Maximum of 3 series reached.')
                  }
                >
                  <span>
                    <Button
                      variant="subtle"
                      className="m-defs__add"
                      disabled={!canAddSeries}
                      onClick={() => metric.addSeries()}
                    >
                      <Plus size={13} />
                      {t('Add series')}
                    </Button>
                  </span>
                </Tooltip>
                {many ? (
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
          </section>
          {breakdown ? (
            <section className="m-defs__group" aria-label={t('Breakdown')}>
              <h4 className="m-defs__head">{t('Breakdown')}</h4>
              <BreakdownFilter
                metric={metric}
                observeChanges={() => metric.updateKey('hasChanged', true)}
              />
            </section>
          ) : null}
        </div>
      </div>
    );
  },
);

const JOURNEY_EVENTS = [FilterKey.LOCATION, FilterKey.CLICK, FilterKey.INPUT];

/** A start or end point, or a list of left-out steps, on the card itself. */
const journeyTarget = (
  metric: any,
  key: 'startPoint' | 'excludes',
): FilterTarget => {
  const read = (): FilterItem[] =>
    key === 'startPoint'
      ? metric.startPoint
        ? [metric.startPoint]
        : []
      : metric.excludes;
  const write = (next: Filter[]) => {
    if (key === 'startPoint')
      metric.updateKey('startPoint', next[0] ? new FilterItem(next[0]) : null);
    else metric.updateExcludes(next);
    metric.updateKey('hasChanged', true);
  };
  return {
    owner: { metric, key },
    get filters() {
      return read() as unknown as readonly Filter[];
    },
    eventsOrder: 'or',
    add: (f) => write(key === 'startPoint' ? [f] : [...(read() as any[]), f]),
    update: (i, f) => write((read() as any[]).map((x, j) => (j === i ? f : x))),
    remove: (i) => write((read() as any[]).filter((_, j) => j !== i)),
    move: () => {},
    setEventsOrder: () => {},
    clear: () => write([]),
  };
};

/** Three groups: Journey (start or end point), Steps (Showing, Leaving out)
    and Filters (the sessions it is drawn from). */
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
  const catalogue = useCatalogue(['sessions']);
  // the events a journey draws: Page, Click, Input and custom events
  const eventEntries = useMemo(
    () =>
      catalogue.filter(
        (e) =>
          e.isEvent &&
          e.category !== 'segments' &&
          e.category !== 'features' &&
          (!e.autoCaptured || JOURNEY_EVENTS.includes(e.name as FilterKey)),
      ),
    [catalogue],
  );
  // the journey query leaves out page, click and input steps by value only
  // (OR-3966): no custom events until the backend reads them
  const excludeEntries = useMemo(
    () => eventEntries.filter((e) => e.autoCaptured),
    [eventEntries],
  );
  // session and user properties: the events are the journey
  const sessionEntries = useMemo(
    () =>
      catalogue.filter(
        (e) =>
          !e.isEvent && e.category !== FilterCategory.DEVTOOLS.toLowerCase(),
      ),
    [catalogue],
  );
  const nodes: any[] = metric.data?.nodes ?? [];
  // a "where" on a step offers the journey's own steps of that kind first
  const hints = useMemo(() => {
    const byType = new Map<string, string[]>();
    [...nodes]
      .sort((a, b) => (a.depth ?? 0) - (b.depth ?? 0))
      .forEach((n) => {
        if (!n.name || !n.eventType) return;
        const list = byType.get(n.eventType) ?? [];
        if (!list.includes(n.name)) list.push(n.name);
        byType.set(n.eventType, list);
      });
    return (f: SearchFilter) =>
      f.eventName && (f.entry.source as any)?.defaultProperty
        ? byType.get(f.eventName)
        : undefined;
  }, [nodes]);

  const observe = () => metric.updateKey('hasChanged', true);
  const point = buildFilterEditor(journeyTarget(metric, 'startPoint'));
  const excludes = buildFilterEditor(journeyTarget(metric, 'excludes'));
  const series = metric.series[0];
  const filters = series
    ? buildFilterEditor(seriesTarget(series.filter, observe))
    : null;
  const named =
    metric.startPoint?.value?.some(Boolean) ||
    (metric.startPoint?.filters ?? []).some((p: any) => p.value?.some(Boolean));
  const auto = nodes.find((n) => n.startingNode && n.name)?.name;

  return (
    <ValueHintsContext.Provider value={hints}>
      <div className="m-jrny m-defs">
        <div className="m-defs__groups has-three">
          <section className="m-defs__group" aria-label={t('Journey')}>
            <h4 className="m-defs__head">{t('Journey')}</h4>
            <Segmented<'start' | 'end'>
              className="m-jrny__fit"
              ariaLabel={t('Start or end point')}
              value={fromEnd ? 'end' : 'start'}
              onChange={(value) =>
                writeOption({ name: 'startType', value: { value } })
              }
              options={[
                {
                  value: 'start',
                  label: t('Start point'),
                  title: t('Where sessions go from here'),
                },
                {
                  value: 'end',
                  label: t('End point'),
                  title: t('How sessions arrived here'),
                },
              ]}
            />
            <RuleChips
              editor={point}
              entries={eventEntries}
              max={1}
              addLabel={fromEnd ? t('Set end point') : t('Set start point')}
              ariaLabel={fromEnd ? t('End point') : t('Start point')}
              placeholder={t('Search events')}
            />
            {!named && auto ? (
              <p className="m-jrny__note">
                {fromEnd
                  ? t('Most sessions end on {{page}}', { page: auto })
                  : t('Most sessions start on {{page}}', { page: auto })}
              </p>
            ) : null}
          </section>

          <section className="m-defs__group" aria-label={t('Steps')}>
            <h4 className="m-defs__head">{t('Steps')}</h4>
            <div className="m-jrny__grid">
              <span className="m-jrny__word">{t('Showing')}</span>
              <div className="m-jrny__ctl">
                <MultiSelect<string>
                  className="m-jrny__fit w-auto"
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
                <RuleChips
                  editor={excludes}
                  entries={excludeEntries}
                  addLabel={t('Add')}
                  ariaLabel={t('Left out of the journey')}
                  placeholder={t('Search events')}
                />
              </div>
            </div>
          </section>

          {filters && (
            <section className="m-defs__group" aria-label={t('Filters')}>
              <h4 className="m-defs__head">{t('Filters')}</h4>
              <RuleChips
                editor={filters}
                entries={sessionEntries}
                addLabel={t('Add filter')}
                ariaLabel={t('Session filters')}
                placeholder={t('Search filters')}
              />
            </section>
          )}
        </div>
      </div>
    </ValueHintsContext.Provider>
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
