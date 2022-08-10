import { connectPlayer } from 'App/player';
import { toggleBottomBlock, NETWORK, EXCEPTIONS } from 'Duck/components/player';
import React from 'react';
import BottomBlock from '../BottomBlock';
import EventRow from './components/EventRow';
import { TYPES } from 'Types/session/event';
import { connect } from 'react-redux';
import TimelineScale from './components/TimelineScale';
import FeatureSelection from './components/FeatureSelection/FeatureSelection';
import TimelinePointer from './components/TimelinePointer';
import VerticalPointerLine from './components/VerticalPointerLine';
import cn from 'classnames';

interface Props {
    resourceList: any[];
    exceptionsList: any[];
    eventsList: any[];
    endTime: number;
    toggleBottomBlock: any;
}
function OverviewPanel(props: Props) {
    const { resourceList, exceptionsList, eventsList, endTime } = props;
    const clickRageList = React.useMemo(() => {
        return eventsList.filter((item: any) => item.type === TYPES.CLICKRAGE);
    }, [eventsList]);
    const scale = 100 / endTime;
    const [selectedFeatures, setSelectedFeatures] = React.useState(['NETWORK', 'ERRORS', 'EVENTS']);

    return (
        <BottomBlock style={{ height: '260px' }}>
            <BottomBlock.Header>
                <span className="font-semibold color-gray-medium mr-4">Overview</span>
                <div className="flex items-center">
                    <FeatureSelection list={selectedFeatures} updateList={setSelectedFeatures} />
                </div>
            </BottomBlock.Header>
            <BottomBlock.Content>
                <div className="overflow-x-auto overflow-y-hidden bg-gray-lightest">
                    <TimelineScale />
                    <div style={{ width: '100%' }} className="transition relative">
                        <VerticalPointerLine />
                        {selectedFeatures.map((feature: any, index: number) => (
                            <div className={cn("-mx-4 px-4", { 'bg-white border-t border-b' : index % 2})}>
                                <EventRow
                                    key={feature}
                                    title={feature}
                                    list={resourceList}
                                    scale={scale}
                                    renderElement={(pointer: any) => <TimelinePointer pointer={pointer} type={feature} />}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </BottomBlock.Content>
        </BottomBlock>
    );
}

export default connect(null, {
    toggleBottomBlock,
})(
    connectPlayer((state: any) => ({
        resourceList: state.resourceList.filter((r: any) => r.isRed() || r.isYellow()),
        exceptionsList: state.exceptionsList,
        eventsList: state.eventList,
        endTime: state.endTime,
    }))(OverviewPanel)
);
