import { IconButton } from '@/ui/actions/IconButton';
import { Button } from '@/ui/actions/button';
import { Notice } from '@/ui/feedback/Notice';
import { MultiSelect } from '@/ui/inputs/multi-select';
import { InlineSelect } from '@/ui/inputs/select';
import { Tooltip } from '@/ui/overlays/tooltip';
import { FilterCategory } from 'Types/filter/filterType';
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
import { projectStore, useStore } from 'App/mstore';
import FilterSeries from 'Components/Dashboard/components/FilterSeries/FilterSeries';

import {
  SingleRule,
  buildFilterEditor,
  useCatalogue,
} from 'Shared/FilterEditor';
import type { FilterTarget } from 'Shared/FilterEditor';

import ExcludeFilters from '../FilterSeries/ExcludeFilters';

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
        {isPathAnalysis && <ExcludeFilters metric={metric} />}
      </>
    );
  },
);

const noop = () => {};

/** The journey's anchor: one event rule, replaceable among the journey's events. */
const StartPoint = observer(({ metric }: { metric: any }) => {
  const all = useCatalogue();
  const target: FilterTarget = {
    filters: [metric.startPoint],
    eventsOrder: 'then',
    add: noop,
    update: (_, f) => metric.updateStartPoint(f),
    remove: noop,
    move: noop,
    setEventsOrder: noop,
    clear: noop,
  };
  const editor = buildFilterEditor(target);
  const rule = editor.events[0] ?? editor.properties[0];
  if (!rule) return null;
  return (
    <SingleRule
      filter={rule}
      editor={editor}
      entries={all.filter((e) => e.isEvent)}
    />
  );
});

const PathAnalysisFilter = observer(({ metric, writeOption }: any) => {
  const { t } = useTranslation();
  const metricValueOptions = [
    { value: 'location', label: t('Page paths') },
    { value: 'title', label: t('Page titles') },
    { value: 'click', label: t('Clicks') },
    { value: 'input', label: t('Inputs') },
    { value: 'custom', label: t('Events') },
  ];

  return (
    <div className="m-jrny">
      <div className="m-jrny__row">
        <span className="m-jrny__word">{t('Journeys with')}</span>
        <InlineSelect<'start' | 'end'>
          value={metric.startType || 'start'}
          onChange={(value) =>
            writeOption({ name: 'startType', value: { value } })
          }
          ariaLabel={t('Start or end point')}
          options={[
            {
              value: 'start',
              label: t('start point'),
              hint: t('Where sessions go from here'),
            },
            {
              value: 'end',
              label: t('end point'),
              hint: t('How sessions arrived here'),
            },
          ]}
        />
        <span className="m-jrny__word">{t('showing')}</span>
        <MultiSelect<string>
          className="m-jrny__showing"
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
      {metric.startPoint ? (
        <div className="m-jrny__row">
          <span className="m-jrny__word">
            {metric.startType === 'end' ? t('End point') : t('Start point')}
          </span>
          <StartPoint metric={metric} />
        </div>
      ) : null}
    </div>
  );
});

const InsightsFilter = observer(({ metric, writeOption }: any) => {
  const { t } = useTranslation();
  return (
    <div className="m-jrny">
      <div className="m-jrny__row">
        <span className="m-jrny__word">{t('Issue categories')}</span>
        <MultiSelect<string>
          className="m-jrny__showing"
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
