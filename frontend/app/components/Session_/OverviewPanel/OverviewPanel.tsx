import { Segmented } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import cn from 'classnames';
import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';

import {
  MobilePlayerContext,
  PlayerContext,
} from 'App/components/Session/playerContext';
import { useStore } from 'App/mstore';
import SummaryBlock from 'Components/Session/Player/ReplayPlayer/SummaryBlock';
import { SummaryButton } from 'Components/Session_/Player/Controls/Controls';
import TimelineZoomButton from 'Components/Session_/Player/Controls/components/TimelineZoomButton';
import { Icon, NoContent } from 'UI';
import TabSelector from '../../shared/DevTools/TabSelector';

import BottomBlock from '../BottomBlock';
import EventRow from './components/EventRow';
import FeatureSelection, {
  HELP_MESSAGE,
} from './components/FeatureSelection/FeatureSelection';
import OverviewPanelContainer from './components/OverviewPanelContainer';
import TimelinePointer from './components/TimelinePointer';
import TimelineScale from './components/TimelineScale';
import VerticalPointerLine, {
  VerticalPointerLineComp,
} from './components/VerticalPointerLine';
import { useTranslation } from 'react-i18next';

function MobileOverviewPanelCont() {
  const { aiSummaryStore, uiPlayerStore, sessionStore } = useStore();
  const { sessionId } = sessionStore.current;
  const issuesList = sessionStore.current.issues;
  const zoomEnabled = uiPlayerStore.timelineZoom.enabled;
  const zoomStartTs = uiPlayerStore.timelineZoom.startTs;
  const zoomEndTs = uiPlayerStore.timelineZoom.endTs;
  const { setZoomTab } = uiPlayerStore;
  const { zoomTab } = uiPlayerStore;
  const { store, player } = React.useContext(MobilePlayerContext);
  const [dataLoaded, setDataLoaded] = React.useState(false);
  const [selectedFeatures, setSelectedFeatures] = React.useState([
    'PERFORMANCE',
    'FRUSTRATIONS',
    'ERRORS',
    'NETWORK',
  ]);

  const {
    endTime,
    eventList: eventsList,
    frustrationsList,
    exceptionsList,
    fetchList,
    performanceChartData,
    performanceList,
  } = store.get();

  const fetchPresented = fetchList.length > 0;

  const checkInZoomRange = (list: any[]) =>
    list.filter((i) =>
      zoomEnabled ? i.time >= zoomStartTs && i.time <= zoomEndTs : true,
    );

  const resources = {
    NETWORK: checkInZoomRange(
      fetchList.filter((r: any) => r.status >= 400 || r.isRed || r.isYellow),
    ),
    ERRORS: checkInZoomRange(exceptionsList),
    EVENTS: checkInZoomRange(eventsList),
    PERFORMANCE: checkInZoomRange(performanceChartData),
    FRUSTRATIONS: checkInZoomRange(frustrationsList),
  };

  useEffect(() => {
    if (dataLoaded) {
      return;
    }

    if (
      exceptionsList.length > 0 ||
      eventsList.length > 0 ||
      issuesList.length > 0 ||
      performanceChartData.length > 0 ||
      frustrationsList.length > 0
    ) {
      setDataLoaded(true);
    }
  }, [
    issuesList,
    exceptionsList,
    eventsList,
    performanceChartData,
    frustrationsList,
  ]);

  React.useEffect(() => {
    player.scale();
  }, [selectedFeatures]);

  const originStr = window.env.ORIGIN || window.location.origin;
  const isSaas = /app\.openreplay\.com/.test(originStr);
  return (
    <PanelComponent
      resources={resources}
      endTime={endTime}
      selectedFeatures={selectedFeatures}
      fetchPresented={fetchPresented}
      setSelectedFeatures={setSelectedFeatures}
      isMobile
      performanceList={performanceList}
      sessionId={sessionId}
      showSummary={isSaas}
      toggleSummary={() =>
        aiSummaryStore.setToggleSummary(!aiSummaryStore.toggleSummary)
      }
      summaryChecked={aiSummaryStore.toggleSummary}
      setZoomTab={setZoomTab}
      zoomTab={zoomTab}
    />
  );
}

function WebOverviewPanelCont() {
  const { aiSummaryStore, uiPlayerStore, sessionStore } = useStore();
  const { sessionId } = sessionStore.current;
  const zoomEnabled = uiPlayerStore.timelineZoom.enabled;
  const zoomStartTs = uiPlayerStore.timelineZoom.startTs;
  const zoomEndTs = uiPlayerStore.timelineZoom.endTs;
  const { setZoomTab } = uiPlayerStore;
  const { zoomTab } = uiPlayerStore;
  const { store } = React.useContext(PlayerContext);
  const [selectedFeatures, setSelectedFeatures] = React.useState([
    'PERFORMANCE',
    'FRUSTRATIONS',
    'ERRORS',
    'NETWORK',
  ]);

  const { endTime, currentTab, tabStates } = store.get();

  const tabValues = Object.values(tabStates);
  const { dataSource } = uiPlayerStore;
  const showSingleTab = dataSource === 'current';

  const {
    stackEventList = [],
    frustrationsList = [],
    exceptionsList = [],
    resourceListUnmap = [],
    fetchList = [],
    graphqlList = [],
    performanceChartData = [],
  } = React.useMemo(() => {
    if (showSingleTab) {
      const stackEventList = tabStates[currentTab].stackList;
      const { frustrationsList } = tabStates[currentTab];
      const { exceptionsList } = tabStates[currentTab];
      const resourceListUnmap = tabStates[currentTab].resourceList;
      const { fetchList } = tabStates[currentTab];
      const { graphqlList } = tabStates[currentTab];
      const { performanceChartData } = tabStates[currentTab];

      return {
        stackEventList,
        frustrationsList,
        exceptionsList,
        resourceListUnmap,
        fetchList,
        graphqlList,
        performanceChartData,
      };
    }
    const stackEventList = tabValues.flatMap((tab) => tab.stackList);
    // these two are global
    const { frustrationsList } = tabValues[0];
    const { exceptionsList } = tabValues[0];
    // we can't compute global chart data because some tabs coexist
    const performanceChartData: any = [];
    const resourceListUnmap = tabValues.flatMap((tab) => tab.resourceList);
    const fetchList = tabValues.flatMap((tab) => tab.fetchList);
    const graphqlList = tabValues.flatMap((tab) => tab.graphqlList);

    return {
      stackEventList,
      frustrationsList,
      exceptionsList,
      resourceListUnmap,
      fetchList,
      graphqlList,
      performanceChartData,
    };
  }, [tabStates, currentTab, dataSource, tabValues]);

  const fetchPresented = fetchList.length > 0;
  const resourceList = resourceListUnmap
    .filter((r: any) => r.isRed || r.isYellow)
    // @ts-ignore
    .concat(fetchList.filter((i: any) => parseInt(i.status) >= 400))
    // @ts-ignore
    .concat(graphqlList.filter((i: any) => parseInt(i.status) >= 400))
    .filter((i: any) => i.type === 'fetch');

  const checkInZoomRange = (list: any[]) =>
    list.filter((i) =>
      zoomEnabled ? i.time >= zoomStartTs && i.time <= zoomEndTs : true,
    );

  const resources: any = React.useMemo(
    () => ({
      NETWORK: checkInZoomRange(resourceList),
      ERRORS: checkInZoomRange(exceptionsList),
      EVENTS: checkInZoomRange(stackEventList),
      PERFORMANCE: checkInZoomRange(performanceChartData),
      FRUSTRATIONS: checkInZoomRange(frustrationsList),
    }),
    [
      tabStates,
      currentTab,
      zoomEnabled,
      zoomStartTs,
      zoomEndTs,
      resourceList.length,
      exceptionsList.length,
      stackEventList.length,
      performanceChartData.length,
      frustrationsList.length,
    ],
  );

  const originStr = window.env.ORIGIN || window.location.origin;
  const isSaas = /app\.openreplay\.com/.test(originStr);
  return (
    <PanelComponent
      resources={resources}
      endTime={endTime}
      selectedFeatures={selectedFeatures}
      fetchPresented={fetchPresented}
      setSelectedFeatures={setSelectedFeatures}
      showSummary={isSaas}
      toggleSummary={() =>
        aiSummaryStore.setToggleSummary(!aiSummaryStore.toggleSummary)
      }
      summaryChecked={aiSummaryStore.toggleSummary}
      sessionId={sessionId}
      setZoomTab={setZoomTab}
      zoomTab={zoomTab}
      showSingleTab={showSingleTab}
    />
  );
}

export function SpotOverviewPanelCont({
  resourceList,
  exceptionsList,
  spotTime,
  spotEndTime,
  onClose,
}: any) {
  const selectedFeatures = ['ERRORS', 'NETWORK'];
  const fetchPresented = false; // TODO
  const endTime = 0; // TODO
  const resources = {
    NETWORK: resourceList,
    ERRORS: exceptionsList,
  };

  return (
    <PanelComponent
      resources={resources}
      endTime={endTime}
      selectedFeatures={selectedFeatures}
      fetchPresented={fetchPresented}
      isSpot
      spotTime={spotTime}
      spotEndTime={spotEndTime}
      onClose={onClose}
    />
  );
}

function PanelComponent({
  selectedFeatures,
  endTime,
  resources,
  fetchPresented,
  setSelectedFeatures,
  isMobile,
  performanceList,
  showSummary,
  toggleSummary,
  summaryChecked,
  sessionId,
  zoomTab,
  setZoomTab,
  isSpot,
  spotTime,
  spotEndTime,
  onClose,
  showSingleTab,
}: any) {
  const { t } = useTranslation();
  return (
    <BottomBlock style={{ height: '100%' }}>
      <BottomBlock.Header customClose={onClose}>
        <div className="mr-4 flex items-center gap-2">
          <span className="font-semibold text-black">{t('X-Ray')}</span>
          {showSummary ? (
            <>
              <SummaryButton
                withToggle
                onClick={toggleSummary}
                toggleValue={summaryChecked}
              />
              {summaryChecked ? (
                <Segmented
                  size="small"
                  value={zoomTab}
                  onChange={(val) => setZoomTab(val)}
                  options={[
                    {
                      label: t('Overview'),
                      value: 'overview',
                    },
                    {
                      label: t('User journey'),
                      value: 'journey',
                    },
                    {
                      label: t('Issues'),
                      value: 'issues',
                    },
                    {
                      label: t('Suggestions'),
                      value: 'errors',
                    },
                  ]}
                />
              ) : null}
            </>
          ) : null}
        </div>
        {isSpot ? null : (
          <div className="flex items-center h-20 mr-4 gap-3">
            <FeatureSelection
              list={selectedFeatures}
              updateList={setSelectedFeatures}
            />
            {!isMobile ? <TabSelector /> : null}
            <TimelineZoomButton />
          </div>
        )}
      </BottomBlock.Header>
      <BottomBlock.Content className="overflow-y-auto">
        {summaryChecked ? <SummaryBlock sessionId={sessionId} /> : null}
        <OverviewPanelContainer endTime={endTime}>
          <TimelineScale endTime={endTime} />
          <div
            style={{ width: 'calc(100% - 1rem)', margin: '0 auto' }}
            className="transition relative"
          >
            <NoContent
              show={selectedFeatures.length === 0}
              style={{ height: '60px', minHeight: 'unset', padding: 0 }}
              title={
                <div className="flex items-center">
                  <InfoCircleOutlined size={18} />
                  {t('Select a debug option to visualize on timeline.')}
                </div>
              }
            >
              {isSpot ? (
                <VerticalPointerLineComp
                  time={spotTime}
                  endTime={spotEndTime}
                />
              ) : (
                <VerticalPointerLine />
              )}
              {selectedFeatures.map((feature: any, index: number) => (
                <div
                  key={feature}
                  className={cn('border-b last:border-none relative', {
                    'bg-white': index % 2,
                  })}
                >
                  <EventRow
                    isGraph={feature === 'PERFORMANCE'}
                    title={feature}
                    disabled={!isMobile && !showSingleTab}
                    list={resources[feature]}
                    renderElement={(pointer: any[], isGrouped: boolean) => (
                      <TimelinePointer
                        pointer={pointer}
                        type={feature}
                        isGrouped={isGrouped}
                        fetchPresented={fetchPresented}
                      />
                    )}
                    endTime={isSpot ? spotEndTime : endTime}
                    message={HELP_MESSAGE(t)[feature]}
                  />
                  {isMobile && feature === 'PERFORMANCE' ? (
                    <div className="absolute top-0 left-0 flex items-center py-4 w-full">
                      <EventRow
                        isGraph={false}
                        title=""
                        list={performanceList}
                        renderElement={(pointer: any) => (
                          <div className="rounded bg-white p-1 border">
                            <TimelinePointer
                              pointer={pointer}
                              type="FRUSTRATIONS"
                              fetchPresented={fetchPresented}
                            />
                          </div>
                        )}
                        endTime={endTime}
                      />
                    </div>
                  ) : null}
                </div>
              ))}
            </NoContent>
          </div>
        </OverviewPanelContainer>
      </BottomBlock.Content>
    </BottomBlock>
  );
}

export const OverviewPanel = observer(WebOverviewPanelCont);

export const MobileOverviewPanel = observer(MobileOverviewPanelCont);
