import SummaryBlock from 'Components/Session/Player/ReplayPlayer/SummaryBlock';
import { SummaryButton } from 'Components/Session_/Player/Controls/Controls';
import React, { useEffect } from 'react';
import { toggleBottomBlock } from 'Duck/components/player';
import BottomBlock from '../BottomBlock';
import EventRow from './components/EventRow';
import { connect } from 'react-redux';
import TimelineScale from './components/TimelineScale';
import FeatureSelection, { HELP_MESSAGE } from './components/FeatureSelection/FeatureSelection';
import TimelinePointer from './components/TimelinePointer';
import VerticalPointerLine from './components/VerticalPointerLine';
import cn from 'classnames';
import OverviewPanelContainer from './components/OverviewPanelContainer';
import { NoContent, Icon } from 'UI';
import { observer } from 'mobx-react-lite';
import { MobilePlayerContext, PlayerContext } from 'App/components/Session/playerContext';
import { useStore } from 'App/mstore';

function MobileOverviewPanelCont({
  issuesList,
  sessionId,
}: {
  issuesList: Record<string, any>[];
  sessionId: string;
}) {
  const { aiSummaryStore } = useStore();
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

  const resources = {
    NETWORK: fetchList.filter((r: any) => r.status >= 400 || r.isRed || r.isYellow),
    ERRORS: exceptionsList,
    EVENTS: eventsList,
    PERFORMANCE: performanceChartData,
    FRUSTRATIONS: frustrationsList,
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
  }, [issuesList, exceptionsList, eventsList, performanceChartData, frustrationsList]);

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
      toggleSummary={() => aiSummaryStore.setToggleSummary(!aiSummaryStore.toggleSummary)}
      summaryChecked={aiSummaryStore.toggleSummary}
    />
  );
}

function WebOverviewPanelCont({ sessionId }: { sessionId: string }) {
  const { aiSummaryStore } = useStore();
  const { store } = React.useContext(PlayerContext);
  const [selectedFeatures, setSelectedFeatures] = React.useState([
    'PERFORMANCE',
    'FRUSTRATIONS',
    'ERRORS',
    'NETWORK',
  ]);

  const { endTime, currentTab, tabStates } = store.get();

  const stackEventList = tabStates[currentTab]?.stackList || [];
  const frustrationsList = tabStates[currentTab]?.frustrationsList || [];
  const exceptionsList = tabStates[currentTab]?.exceptionsList || [];
  const resourceListUnmap = tabStates[currentTab]?.resourceList || [];
  const fetchList = tabStates[currentTab]?.fetchList || [];
  const graphqlList = tabStates[currentTab]?.graphqlList || [];
  const performanceChartData = tabStates[currentTab]?.performanceChartData || [];

  const fetchPresented = fetchList.length > 0;
  const resourceList = resourceListUnmap
    .filter((r: any) => r.isRed || r.isYellow)
    // @ts-ignore
    .concat(fetchList.filter((i: any) => parseInt(i.status) >= 400))
    // @ts-ignore
    .concat(graphqlList.filter((i: any) => parseInt(i.status) >= 400))
    .filter((i: any) => i.type === 'fetch');

  const resources: any = React.useMemo(() => {
    return {
      NETWORK: resourceList,
      ERRORS: exceptionsList,
      EVENTS: stackEventList,
      PERFORMANCE: performanceChartData,
      FRUSTRATIONS: frustrationsList,
    };
  }, [tabStates, currentTab]);

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
      toggleSummary={() => aiSummaryStore.setToggleSummary(!aiSummaryStore.toggleSummary)}
      summaryChecked={aiSummaryStore.toggleSummary}
      sessionId={sessionId}
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
}: any) {
  return (
    <React.Fragment>
      <BottomBlock style={{ height: '100%' }}>
        <BottomBlock.Header>
          <div className="mr-4 flex items-center gap-2">
            <span className={'font-semibold text-black'}>X-Ray</span>
            {showSummary ? (
              <SummaryButton withToggle onClick={toggleSummary} toggleValue={summaryChecked} />
            ) : null}
          </div>
          <div className="flex items-center h-20 mr-4">
            <FeatureSelection list={selectedFeatures} updateList={setSelectedFeatures} />
          </div>
        </BottomBlock.Header>
        <BottomBlock.Content className={'overflow-y-auto'}>
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
                    <Icon name="info-circle" className="mr-2" size="18" />
                    Select a debug option to visualize on timeline.
                  </div>
                }
              >
                <VerticalPointerLine />
                {selectedFeatures.map((feature: any, index: number) => (
                  <div
                    key={feature}
                    className={cn('border-b last:border-none relative', { 'bg-white': index % 2 })}
                  >
                    <EventRow
                      isGraph={feature === 'PERFORMANCE'}
                      title={feature}
                      list={resources[feature]}
                      renderElement={(pointer: any) => (
                        <TimelinePointer
                          pointer={pointer}
                          type={feature}
                          fetchPresented={fetchPresented}
                        />
                      )}
                      endTime={endTime}
                      message={HELP_MESSAGE[feature]}
                    />
                    {isMobile && feature === 'PERFORMANCE' ? (
                      <div className={'absolute top-0 left-0 flex items-center py-4 w-full'}>
                        <EventRow
                          isGraph={false}
                          title={''}
                          list={performanceList}
                          renderElement={(pointer: any) => (
                            <div className="rounded bg-white p-1 border">
                              <TimelinePointer
                                pointer={pointer}
                                type={'FRUSTRATIONS'}
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
    </React.Fragment>
  );
}

export const OverviewPanel = connect(
  (state: Record<string, any>) => ({
    issuesList: state.getIn(['sessions', 'current']).issues,
    sessionId: state.getIn(['sessions', 'current']).sessionId,
  }),
  {
    toggleBottomBlock,
  }
)(observer(WebOverviewPanelCont));

export const MobileOverviewPanel = connect(
  (state: Record<string, any>) => ({
    issuesList: state.getIn(['sessions', 'current']).issues,
    sessionId: state.getIn(['sessions', 'current']).sessionId,
  }),
  {
    toggleBottomBlock,
  }
)(observer(MobileOverviewPanelCont));
