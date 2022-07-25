import { connectPlayer, Controls } from 'App/player';
import { toggleBottomBlock, NETWORK, EXCEPTIONS } from 'Duck/components/player';
import React from 'react';
import BottomBlock from '../BottomBlock';
import EventRow from './components/EventRow';
import { TYPES } from 'Types/session/event';
import { Icon } from 'UI';
import { Tooltip } from 'react-tippy';
import stl from './overviewPanel.module.css';
import { connect } from 'react-redux';

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

    const createEventClickHandler = (pointer: any, type: any) => (e: any) => {
        e.stopPropagation();
        Controls.jump(pointer.time);
        if (!type) {
            return;
        }

        props.toggleBottomBlock(type);
    };

    const renderNetworkElement = (item: any) => {
        return (
            <Tooltip
                html={
                    <div className={stl.popup}>
                        <b>{item.success ? 'Slow resource: ' : 'Missing resource:'}</b>
                        <br />
                        {item.name}
                    </div>
                }
                delay={0}
                position="top"
            >
                <div onClick={createEventClickHandler(item, NETWORK)} className="cursor-pointer">
                    <div className="h-2 w-2 rounded-full bg-red" />
                </div>
            </Tooltip>
        );
    };

    const renderClickRageElement = (item: any) => {
        return (
            <Tooltip
                html={
                    <div className={stl.popup}>
                        <b>{'Click Rage'}</b>
                    </div>
                }
                delay={0}
                position="top"
            >
                <div onClick={createEventClickHandler(item, null)} className="cursor-pointer">
                    <Icon className="bg-white" name="funnel/emoji-angry" color="red" size="16" />
                </div>
            </Tooltip>
        );
    };

    const renderExceptionElement = (item: any) => {
        return (
            <Tooltip
                html={
                    <div className={stl.popup}>
                        <b>{'Exception'}</b>
                        <br />
                        <span>{item.message}</span>
                    </div>
                }
                delay={0}
                position="top"
            >
                <div onClick={createEventClickHandler(item, EXCEPTIONS)} className="cursor-pointer">
                    <Icon className="rounded-full bg-white" name="funnel/exclamation-circle-fill" color="red" size="16" />
                </div>
            </Tooltip>
        );
    };

    return (
        <BottomBlock style={{ height: '240px' }}>
            <BottomBlock.Header>
                <span className="font-semibold color-gray-medium mr-4">Overview</span>
            </BottomBlock.Header>
            <BottomBlock.Content>
                <div className="overflow-x-auto overflow-y-hidden bg-gray-lightest px-4">
                    <div style={{ width: '100%' }} className="transition relative">
                        <VerticalPointerLine />
                        <EventRow title="Network" className="" list={resourceList} scale={scale} renderElement={renderNetworkElement} />
                        <div className="bg-white border-t border-b -mx-4 px-4">
                            <EventRow title="Click Rage" className="" list={clickRageList} scale={scale} renderElement={renderClickRageElement} />
                        </div>
                        <EventRow title="Errors & Issues" className="" list={exceptionsList} scale={scale} renderElement={renderExceptionElement} />
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

const VerticalPointerLine = connectPlayer((state: any) => ({
    time: state.time,
    scale: 100 / state.endTime,
}))(({ time, scale }: any) => {
    const left = time * scale;
    return <div className="absolute border-r border-teal border-dashed z-10" style={{ left: `${left}%`, height: '250px', width: '1px' }} />;
});
