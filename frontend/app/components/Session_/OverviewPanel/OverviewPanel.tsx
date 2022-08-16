import { connectPlayer } from 'App/player';
import { toggleBottomBlock } from 'Duck/components/player';
import React, { useEffect } from 'react';
import BottomBlock from '../BottomBlock';
import EventRow from './components/EventRow';
import { TYPES } from 'Types/session/event';
import { connect } from 'react-redux';
import TimelineScale from './components/TimelineScale';
import FeatureSelection from './components/FeatureSelection/FeatureSelection';
import TimelinePointer from './components/TimelinePointer';
import VerticalPointerLine from './components/VerticalPointerLine';
import cn from 'classnames';
// import VerticalLine from './components/VerticalLine';
import OverviewPanelContainer from './components/OverviewPanelContainer';

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
    const [selectedFeatures, setSelectedFeatures] = React.useState(['PERFORMANCE', 'ERRORS', 'EVENTS']);

    const resources: any = React.useMemo(() => {
        const { resourceList, exceptionsList, eventsList, stackEventList, issuesList, performanceChartData } = props;
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

        if (props.resourceList.length > 0) {
            setDataLoaded(true);
        }
    }, [props.resourceList]);

    return (
        dataLoaded && (
            <Wrapper {...props}>
                <BottomBlock style={{ height: '250px' }}>
                    <BottomBlock.Header>
                        <span className="font-semibold color-gray-medium mr-4">X-RAY</span>
                        <div className="flex items-center h-20">
                            <FeatureSelection list={selectedFeatures} updateList={setSelectedFeatures} />
                        </div>
                    </BottomBlock.Header>
                    <BottomBlock.Content>
                        <OverviewPanelContainer endTime={props.endTime}>
                            <TimelineScale endTime={props.endTime} />
                            <div style={{ width: '100%', height: '200px' }} className="transition relative">
                                <VerticalPointerLine />
                                {selectedFeatures.map((feature: any, index: number) => (
                                    <div className={cn('border-b', { 'bg-white': index % 2 })}>
                                        <EventRow
                                            isGraph={feature === 'PERFORMANCE'}
                                            key={feature}
                                            title={feature}
                                            list={resources[feature]}
                                            renderElement={(pointer: any) => <TimelinePointer pointer={pointer} type={feature} />}
                                            endTime={props.endTime}
                                        />
                                    </div>
                                ))}
                            </div>
                        </OverviewPanelContainer>
                    </BottomBlock.Content>
                </BottomBlock>
            </Wrapper>
        )
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
        resourceList: state.resourceList.filter((r: any) => r.isRed() || r.isYellow()),
        exceptionsList: state.exceptionsList,
        eventsList: state.eventList,
        stackEventList: state.stackList,
        performanceChartData: state.performanceChartData,
        endTime: state.endTime,
        // endTime: 30000000,
    }))(OverviewPanel)
);

const Wrapper = React.memo((props: any) => {
    return <div>{props.children}</div>;
});
