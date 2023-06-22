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
import { PlayerContext } from 'App/components/Session/playerContext';

function OverviewPanel({ issuesList }: { issuesList: Record<string, any>[] }) {
  const { store } = React.useContext(PlayerContext);
  const [dataLoaded, setDataLoaded] = React.useState(false);
  const [selectedFeatures, setSelectedFeatures] = React.useState([
    'PERFORMANCE',
    'FRUSTRATIONS',
    'ERRORS',
    'NETWORK',
  ]);

  const {
    endTime,
    currentTab,
    tabStates,
  } = store.get();
  const states = Object.values(tabStates)

  const stackEventList = tabStates[currentTab]?.stackList || []
  const eventsList = tabStates[currentTab]?.eventList || []
  const frustrationsList = tabStates[currentTab]?.frustrationsList || []
  const exceptionsList = tabStates[currentTab]?.exceptionsList || []
  const resourceListUnmap = tabStates[currentTab]?.resourceList || []
  const fetchList = tabStates[currentTab]?.fetchList || []
  const graphqlList = tabStates[currentTab]?.graphqlList || []
  const performanceChartData = tabStates[currentTab]?.performanceChartData || []

  const fetchPresented = fetchList.length > 0;
  const resourceList = resourceListUnmap
    .filter((r: any) => r.isRed || r.isYellow)
    .concat(fetchList.filter((i: any) => parseInt(i.status) >= 400))
    .concat(graphqlList.filter((i: any) => parseInt(i.status) >= 400))
    .filter((i: any) => i.type === "fetch");

  const resources: any = React.useMemo(() => {
    return {
      NETWORK: resourceList,
      ERRORS: exceptionsList,
      EVENTS: stackEventList,
      PERFORMANCE: performanceChartData,
      FRUSTRATIONS: frustrationsList,
    };
  }, [dataLoaded, currentTab]);

  useEffect(() => {
    if (dataLoaded) {
      return;
    }

    if (
      resourceList.length > 0 ||
      exceptionsList.length > 0 ||
      eventsList.length > 0 ||
      stackEventList.length > 0 ||
      issuesList.length > 0 ||
      performanceChartData.length > 0
    ) {
      setDataLoaded(true);
    }
  }, [resourceList, issuesList, exceptionsList, eventsList, stackEventList, performanceChartData, currentTab]);

  return (
    <React.Fragment>
      <BottomBlock style={{ height: '100%' }}>
        <BottomBlock.Header>
          <span className="font-semibold color-gray-medium mr-4">X-RAY</span>
          <div className="flex items-center h-20">
            <FeatureSelection list={selectedFeatures} updateList={setSelectedFeatures} />
          </div>
        </BottomBlock.Header>
        <BottomBlock.Content>
          <OverviewPanelContainer endTime={endTime}>
            <TimelineScale endTime={endTime} />
            <div
              // style={{ width: '100%', height: '187px', overflow: 'hidden' }}
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
                    className={cn('border-b last:border-none', { 'bg-white': index % 2 })}
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

export default connect(
  (state: any) => ({
    issuesList: state.getIn(['sessions', 'current']).issues,
  }),
  {
    toggleBottomBlock,
  }
)(observer(OverviewPanel));
