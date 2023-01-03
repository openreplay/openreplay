import React, { useEffect } from 'react';
import { toggleBottomBlock } from 'Duck/components/player';
import BottomBlock from '../BottomBlock';
import EventRow from './components/EventRow';
import { TYPES } from 'Types/session/event';
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
  const { store } = React.useContext(PlayerContext)
  const [dataLoaded, setDataLoaded] = React.useState(false);
  const [selectedFeatures, setSelectedFeatures] = React.useState([
    'PERFORMANCE',
    'ERRORS',
    'NETWORK',
  ]);

    const {
      endTime,
      performanceChartData,
      stackList: stackEventList,
      eventList: eventsList,
      exceptionsList,
      resourceList: resourceListUnmap,
      fetchList,
      graphqlList,
    } = store.get()

    const fetchPresented = fetchList.length > 0;

    const resourceList = resourceListUnmap
      .filter((r: any) => r.isRed() || r.isYellow())
      .concat(fetchList.filter((i: any) => parseInt(i.status) >= 400))
      .concat(graphqlList.filter((i: any) => parseInt(i.status) >= 400))

  const resources: any = React.useMemo(() => {
    return {
      NETWORK: resourceList,
      ERRORS: exceptionsList,
      EVENTS: stackEventList,
      CLICKRAGE: eventsList.filter((item: any) => item.type === TYPES.CLICKRAGE),
      PERFORMANCE: performanceChartData,
    };
  }, [dataLoaded]);

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
  }, [
    resourceList,
    issuesList,
    exceptionsList,
    eventsList,
    stackEventList,
    performanceChartData,
  ]);

  return (
      <BottomBlock style={{ height: '245px' }}>
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
              style={{ width: 'calc(100vw - 1rem)', margin: '0 auto', height: '187px' }}
              className="transition relative"
            >
              <NoContent
                show={selectedFeatures.length === 0}
                title={
                  <div className="flex items-center mt-16">
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
  );
}

export default connect(
  (state: any) => ({
    issuesList: state.getIn(['sessions', 'current']).issues,
  }),
  {
    toggleBottomBlock,
  }
)(
  observer(OverviewPanel)
)
