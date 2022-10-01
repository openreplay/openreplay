import { connectPlayer } from 'App/player';
import { toggleBottomBlock } from 'Duck/components/player';
import React, { useEffect } from 'react';
import BottomBlock from '../BottomBlock';
import EventRow from './components/EventRow';
import { TYPES } from 'Types/session/event';
import { connect } from 'react-redux';
import TimelineScale from './components/TimelineScale';
import FeatureSelection, { HELP_MESSAGE } from './components/FeatureSelection/FeatureSelection';
import TimelinePointer from './components/TimelinePointer';
import VerticalPointerLine from './components/VerticalPointerLine';
import cn from 'classnames';
// import VerticalLine from './components/VerticalLine';
import OverviewPanelContainer from './components/OverviewPanelContainer';
import { NoContent, Icon } from 'UI';

interface Props {
  resourceList: any[];
  exceptionsList: any[];
  eventsList: any[];
  toggleBottomBlock: any;
  stackEventList: any[];
  issuesList: any[];
  performanceChartData: any;
  endTime: number;
}
function OverviewPanel(props: Props) {
  const [dataLoaded, setDataLoaded] = React.useState(false);
  const [selectedFeatures, setSelectedFeatures] = React.useState([
    'PERFORMANCE',
    'ERRORS',
    // 'EVENTS',
    'NETWORK',
  ]);

  const resources: any = React.useMemo(() => {
    const {
      resourceList,
      exceptionsList,
      eventsList,
      stackEventList,
      issuesList,
      performanceChartData,
    } = props;
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
      props.resourceList.length > 0 ||
      props.exceptionsList.length > 0 ||
      props.eventsList.length > 0 ||
      props.stackEventList.length > 0 ||
      props.issuesList.length > 0 ||
      props.performanceChartData.length > 0
    ) {
      setDataLoaded(true);
    }
  }, [
    props.resourceList,
    props.exceptionsList,
    props.eventsList,
    props.stackEventList,
    props.performanceChartData,
  ]);

  return (
    <Wrapper {...props}>
      <BottomBlock style={{ height: '245px' }}>
        <BottomBlock.Header>
          <span className="font-semibold color-gray-medium mr-4">X-RAY</span>
          <div className="flex items-center h-20">
            <FeatureSelection list={selectedFeatures} updateList={setSelectedFeatures} />
          </div>
        </BottomBlock.Header>
        <BottomBlock.Content>
          <OverviewPanelContainer endTime={props.endTime}>
            <TimelineScale endTime={props.endTime} />
            <div style={{ width: '100%', height: '187px' }} className="transition relative">
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
                        <TimelinePointer pointer={pointer} type={feature} />
                      )}
                      endTime={props.endTime}
                      message={HELP_MESSAGE[feature]}
                    />
                  </div>
                ))}
              </NoContent>
            </div>
          </OverviewPanelContainer>
        </BottomBlock.Content>
      </BottomBlock>
    </Wrapper>
  );
}

export default connect(
  (state: any) => ({
    issuesList: state.getIn(['sessions', 'current', 'issues']),
  }),
  {
    toggleBottomBlock,
  }
)(
  connectPlayer((state: any) => ({
    resourceList: state.resourceList
      .filter((r: any) => r.isRed() || r.isYellow())
      .concat(state.fetchList.filter((i: any) => parseInt(i.status) >= 400))
      .concat(state.graphqlList.filter((i: any) => parseInt(i.status) >= 400)),
    exceptionsList: state.exceptionsList,
    eventsList: state.eventList,
    stackEventList: state.stackList,
    performanceChartData: state.performanceChartData,
    endTime: state.endTime,
  }))(OverviewPanel)
);

const Wrapper = React.memo((props: any) => {
  return <>{props.children}</>;
});
