import { Segmented } from '@/ui/inputs/toggle-group';
import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import {
  MobilePlayerContext,
  PlayerContext,
} from 'App/components/Session/playerContext';
import { useStore } from 'App/mstore';
import SummaryBlock from 'Components/Session/Player/ReplayPlayer/SummaryBlock';
import SummaryButton from 'Components/Session_/Player/Controls/SummaryButton';
import TimelineZoomButton from 'Components/Session_/Player/Controls/components/TimelineZoomButton';

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

function MobileOverviewPanelCont() {
  const { aiSummaryStore, uiPlayerStore, sessionStore } = useStore();
  const { sessionId } = sessionStore.current;
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
      performanceChartData.length > 0 ||
      frustrationsList.length > 0
    ) {
      setDataLoaded(true);
    }
  }, [exceptionsList, eventsList, performanceChartData, frustrationsList]);

  React.useEffect(() => {
    player.scale();
  }, [selectedFeatures]);

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
      showSummary
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

  const tabValues = Object.values(tabStates) ?? [];
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
    const { frustrationsList = [] } = tabValues[0];
    const { exceptionsList = [] } = tabValues[0];
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

  return (
    <PanelComponent
      resources={resources}
      endTime={endTime}
      selectedFeatures={selectedFeatures}
      fetchPresented={fetchPresented}
      setSelectedFeatures={setSelectedFeatures}
      showSummary
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
  jump,
}: any) {
  const selectedFeatures = ['ERRORS', 'NETWORK'];
  const fetchPresented = false; // TODO
  const endTime = spotEndTime;
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
      jump={jump}
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
  jump,
}: any) {
  const { t } = useTranslation();
  const counts = Object.fromEntries(
    Object.entries(resources).map(([k, v]: [string, any]) => [
      k,
      k === 'PERFORMANCE' ? 0 : (v?.length ?? 0),
    ]),
  );
  const lane = (
    feature: any,
    marks?: { marks: any[]; renderMark: (p: any) => React.ReactNode },
  ) => (
    <EventRow
      key={feature}
      {...marks}
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
          jump={jump}
          isSpot={isSpot}
        />
      )}
      endTime={isSpot ? spotEndTime : endTime}
      message={HELP_MESSAGE(t)[feature]}
    />
  );
  return (
    <BottomBlock>
      <BottomBlock.Header customClose={onClose}>
        <div className="m-dt__bar-left">
          {isSpot ? (
            <span className="m-dt__title">{t('X-Ray')}</span>
          ) : (
            <FeatureSelection
              list={selectedFeatures}
              updateList={setSelectedFeatures}
              sessionId={sessionId}
              counts={counts}
            />
          )}
          {showSummary ? (
            <>
              <SummaryButton
                withToggle
                onClick={toggleSummary}
                toggleValue={summaryChecked}
              />
              {summaryChecked ? (
                <Segmented
                  ariaLabel={t('Zoom view')}
                  value={zoomTab}
                  onChange={(val) => setZoomTab(val as any)}
                  options={[
                    { label: t('Overview'), value: 'overview' },
                    { label: t('User journey'), value: 'journey' },
                    { label: t('Issues'), value: 'issues' },
                    { label: t('Suggestions'), value: 'errors' },
                  ]}
                />
              ) : null}
            </>
          ) : null}
        </div>
        {isSpot ? null : (
          <div className="m-dt__bar-right">
            {!isMobile ? <TabSelector /> : null}
            <TimelineZoomButton />
          </div>
        )}
      </BottomBlock.Header>
      <BottomBlock.Content>
        <div className="flex flex-col min-h-0">
          {summaryChecked ? <SummaryBlock sessionId={sessionId} /> : null}
          <OverviewPanelContainer endTime={endTime}>
            <TimelineScale endTime={endTime} />
            {selectedFeatures.length === 0 ? (
              <p className="m-dt__nodata-hint m-dt__xray-empty">
                {t('Select a lane to visualize on the timeline.')}
              </p>
            ) : null}
            {selectedFeatures.map((feature: string) =>
              isMobile && feature === 'PERFORMANCE'
                ? lane(feature, {
                    marks: performanceList,
                    renderMark: (pointer: any) => (
                      <TimelinePointer
                        pointer={pointer}
                        type="FRUSTRATIONS"
                        fetchPresented={fetchPresented}
                        isSpot={isSpot}
                      />
                    ),
                  })
                : lane(feature),
            )}
            {isSpot ? (
              <VerticalPointerLineComp time={spotTime} endTime={spotEndTime} />
            ) : (
              <VerticalPointerLine />
            )}
          </OverviewPanelContainer>
        </div>
      </BottomBlock.Content>
    </BottomBlock>
  );
}

export const OverviewPanel = observer(WebOverviewPanelCont);

export const MobileOverviewPanel = observer(MobileOverviewPanelCont);
