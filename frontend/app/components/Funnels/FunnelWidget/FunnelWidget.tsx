import { useStore } from '@/mstore';
import Filter from '@/mstore/types/filter';
import { Tag, Tooltip } from 'antd';
import cn from 'classnames';
import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import TopNButton from 'App/components/Dashboard/components/BreakdownFilter/TopNButton';
import { useModal } from 'App/components/Modal';
import Funnel from 'App/mstore/types/funnel';
import Widget from 'App/mstore/types/widget';
import { Icon, NoContent } from 'UI';

import Funnelbar, { UxTFunnelBar } from './FunnelBar';
import stl from './FunnelWidget.module.css';

interface Props {
  metric?: Widget;
  isWidget?: boolean;
  data: { funnel: Funnel; funnelBreakdown?: Record<string, Funnel> };
  compData: { funnel: Funnel; funnelBreakdown?: Record<string, Funnel> };
}

function FunnelWidget(props: Props) {
  const { t } = useTranslation();
  const { dashboardStore, metricStore } = useStore();
  const [focusedFilter, setFocusedFilter] = React.useState<number | null>(null);
  const { isWidget = false, data, metric, compData } = props;
  const funnel = data?.funnel || { stages: [] };
  const totalSteps = funnel.stages.length;
  const stages = isWidget
    ? [...funnel.stages.slice(0, 1), funnel.stages[funnel.stages.length - 1]]
    : funnel.stages;
  const hasMoreSteps = funnel.stages.length > 2;
  const lastStage = funnel.stages[funnel.stages.length - 1];
  const remainingSteps = totalSteps - 2;
  const { hideModal } = useModal();
  const metricLabel =
    metric?.metricFormat == 'userCount' ? t('Users') : t('Sessions');
  const { drillDownFilter } = dashboardStore;
  const { drillDownPeriod } = dashboardStore;
  const comparisonPeriod = metric
    ? dashboardStore.comparisonPeriods[metric.metricId]
    : undefined;
  const metricFilters = metric?.series[0]?.filter.filters || [];

  const applyDrillDown = (index: number, isComp?: boolean) => {
    const filter = new Filter().fromData({
      filters: metricFilters.slice(0, index + 1),
    });
    const periodTimestamps =
      isComp && index > -1
        ? comparisonPeriod.toTimestamps()
        : drillDownPeriod.toTimestamps();

    drillDownFilter.merge({
      filters: filter.toJson().filters,
      startTimestamp: periodTimestamps.startTimestamp,
      endTimestamp: periodTimestamps.endTimestamp,
    });
  };

  useEffect(
    () => () => {
      if (isWidget) return;
      hideModal();
    },
    [],
  );

  const focusStage = (index: number, isComp?: boolean) => {
    funnel.stages.forEach((s, i) => {
      // turning on all filters if one was focused already
      if (focusedFilter === index) {
        s.updateKey('isActive', true);
        setFocusedFilter(null);
      } else {
        setFocusedFilter(index);
        if (i === index) {
          s.updateKey('isActive', true);
        } else {
          s.updateKey('isActive', false);
        }
      }
    });

    applyDrillDown(focusedFilter === index ? -1 : index, isComp);
  };

  const topN = metricStore.breakdownTopN;
  const funnelBreakdown = data?.funnelBreakdown;
  const compBreakdown = compData?.funnelBreakdown;
  const allBreakdownKeys = funnelBreakdown ? Object.keys(funnelBreakdown) : [];
  const breakdownKeys =
    topN > 0 ? allBreakdownKeys.slice(0, topN) : allBreakdownKeys;

  const shownStages = React.useMemo(() => {
    const stages: {
      data: Funnel['stages'][0];
      compData?: Funnel['stages'][0];
      breakdownStages?: {
        key: string;
        stage: Funnel['stages'][0];
        compStage?: Funnel['stages'][0];
      }[];
    }[] = [];
    for (let i = 0; i < funnel.stages.length; i++) {
      const stage: any = { data: funnel.stages[i], compData: undefined };
      const compStage = compData?.funnel?.stages?.[i];
      if (compStage) {
        stage.compData = compStage;
      }
      if (funnelBreakdown) {
        stage.breakdownStages = breakdownKeys
          .map((key) => ({
            key,
            stage: funnelBreakdown[key]?.stages?.[i],
            compStage: compBreakdown?.[key]?.stages?.[i],
          }))
          .filter((b) => b.stage);
      }
      stages.push(stage);
    }

    return stages;
  }, [data, compData, breakdownKeys]);

  const viewType = metric?.viewType;
  const isHorizontal = viewType === 'columnChart';
  const noEvents = metric.series[0].filter.filters.length === 0;
  const isUsers = metric?.metricFormat === 'userCount';

  const compLabel = React.useMemo(() => {
    if (!comparisonPeriod) return '';
    const ts = comparisonPeriod.toTimestamps?.() ?? comparisonPeriod;
    if (!ts.startTimestamp || !ts.endTimestamp) return t('Previous period');
    const start = new Date(ts.startTimestamp).toLocaleDateString();
    const end = new Date(ts.endTimestamp).toLocaleDateString();
    return `${start} – ${end}`;
  }, [comparisonPeriod]);
  return (
    <NoContent
      style={{ minHeight: 220 }}
      title={
        <div className="flex items-center text-lg">
          <Icon name="info-circle" className="mr-2" size="18" />
          {noEvents
            ? t('Select an event to start seeing the funnel')
            : t('No data available for the selected period.')}
        </div>
      }
      show={!stages || stages.length === 0}
    >
      <div
        className={cn(
          'w-full border-b -mx-4 px-4',
          isHorizontal
            ? 'overflow-x-scroll custom-scrollbar flex gap-2 justify-around'
            : '',
        )}
      >
        {!isWidget &&
          shownStages.map((stage: any, index: any) => (
            <Stage
              key={index}
              isHorizontal={isHorizontal}
              index={index + 1}
              isWidget={isWidget}
              stage={stage.data}
              compData={stage.compData}
              breakdownStages={stage.breakdownStages}
              focusStage={focusStage}
              focusedFilter={focusedFilter}
              metricLabel={metricLabel}
              compLabel={
                stage.compData
                  ? `${t('Previous Step')} ${index + 1}${compLabel ? ` (${compLabel})` : ''}`
                  : undefined
              }
            />
          ))}

        {isWidget && (
          <>
            <Stage index={1} isWidget={isWidget} stage={stages[0]} />

            {hasMoreSteps && <EmptyStage total={remainingSteps} />}

            {funnel.stages.length > 1 && (
              <Stage index={totalSteps} isWidget={isWidget} stage={lastStage} />
            )}
          </>
        )}
      </div>
      <div className="flex items-center py-2 gap-2">
        <div className="flex items-center">
          <span className="text-base font-medium mr-2">
            {t('Total conversion')}
          </span>
          <Tooltip
            title={`${funnel.totalConversions} ${isUsers ? t('Users') : t('Sessions')} ${funnel.totalConversionsPercentage}%`}
          >
            <Tag
              variant="filled"
              color="var(--color-gray-lightest)"
              className="rounded-lg! text-gray-lightest!"
            >
              {funnel.totalConversions}
            </Tag>
          </Tooltip>
        </div>
        <div className="flex items-center">
          <span className="text-base font-medium mr-2">
            {t('Lost conversion')}
          </span>
          <Tooltip
            title={`${funnel.lostConversions} Sessions ${funnel.lostConversionsPercentage}%`}
          >
            <Tag
              variant="filled"
              color="var(--color-red-lightest)"
              className="rounded-lg! text-red-lightest!"
            >
              {funnel.lostConversions}
            </Tag>
          </Tooltip>
        </div>
      </div>
      {funnel.totalDropDueToIssues > 0 && (
        <div className="flex items-center mb-2">
          <Icon name="magic" />{' '}
          <span className="ml-2">
            {funnel.totalDropDueToIssues}&nbsp;
            {t('sessions dropped due to issues.')}
          </span>
        </div>
      )}
      {allBreakdownKeys.length > 0 && (
        <div className="flex items-center">
          <TopNButton totalValues={allBreakdownKeys.length} />
        </div>
      )}
    </NoContent>
  );
}

export const EmptyStage = observer(({ total }: any) => (
  <div
    className={cn(
      'flex items-center mb-4 pb-3 relative border-b -mx-4 px-4 pt-2',
    )}
  >
    <IndexNumber index={0} />
    <div
      className="w-fit px-2 border border-teal py-1 text-center justify-center bg-teal-lightest flex items-center rounded-full color-teal"
      style={{ width: '100px' }}
    >
      {`+${total} ${total > 1 ? 'steps' : 'step'}`}
    </div>
    <div className="border-b w-full border-dashed" />
  </div>
));

export const Stage = observer(
  ({
    metricLabel,
    stage,
    index,
    uxt,
    focusStage,
    focusedFilter,
    compData,
    isHorizontal,
    breakdownStages,
    compLabel,
  }: any) =>
    stage ? (
      <div
        className={cn('flex items-start relative pt-2', {
          [stl['step-disabled']]: !stage.isActive,
        })}
      >
        <IndexNumber index={index} />
        {!uxt ? (
          <Funnelbar
            isHorizontal={isHorizontal}
            compData={compData}
            metricLabel={metricLabel}
            index={index}
            filter={stage}
            focusStage={focusStage}
            focusedFilter={focusedFilter}
            breakdownStages={breakdownStages}
            compLabel={compLabel}
          />
        ) : (
          <UxTFunnelBar filter={stage} />
        )}
      </div>
    ) : null,
);

export const IndexNumber = observer(({ index }: any) => (
  <div className="z-10 w-6 h-6 border shrink-0 mr-4 text-sm rounded-full bg-gray-lightest flex items-center justify-center leading-3">
    {index === 0 ? <Icon size="14" color="gray-dark" name="list" /> : index}
  </div>
));

export default observer(FunnelWidget);
