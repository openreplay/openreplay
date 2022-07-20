import { connectPlayer } from 'App/player';
import React from 'react';
import BottomBlock from '../BottomBlock';
import EventRow from './components/EventRow';
import { TYPES } from 'Types/session/event';
import { Icon } from 'UI';
import { Tooltip } from 'react-tippy';
import stl from './overviewPanel.module.css';

interface Props {
    resourceList: any[];
    exceptionsList: any[];
    eventsList: any[];
    endTime: number;
}
function OverviewPanel(props: Props) {
    const { resourceList, exceptionsList, eventsList, endTime } = props;
    const clickRageList = React.useMemo(() => {
        return eventsList.filter((item: any) => item.type === TYPES.CLICKRAGE);
    }, [eventsList]);

    const containerRef = React.useRef<HTMLDivElement>(null);
    const innerRef = React.createRef<HTMLDivElement>();
    const scale = 100 / endTime;

    let width = 100;
    const SPEED = 5;

    const onWheel = (e: React.UIEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        const delta = e.deltaY;
        if (delta > 0) {
            width += SPEED;
        } else {
            width -= SPEED;
        }
        if (width < 100) {
            width = 100;
        }
        if (innerRef.current) {
            innerRef.current.style.width = width + '%';
            if (containerRef.current) {
                containerRef.current.style.left = (100 - width) / 2 + '%';
            }
        }
    };

    const renderNetworkElement = (item: any) => {
        return <div className="h-2 w-2 rounded-full bg-red" />;
    };

    const renderClickRageElement = (item: any) => {
        return (
            <div className="">
                <Icon className="bg-white" name="funnel/emoji-angry" color="red" size="16" />
            </div>
        );
    };

    const renderExceptionElement = (item: any) => {
        // console.log('item', item);
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
                <Icon className="rounded-full bg-white" name="funnel/exclamation-circle-fill" color="red" size="16" />
            </Tooltip>
        );
    };

    return (
        <BottomBlock style={{ height: '300px' }}>
            <BottomBlock.Header>
                <div className="flex items-center">
                    <span className="font-semibold color-gray-medium mr-4">Overview</span>
                </div>
            </BottomBlock.Header>
            <BottomBlock.Content>
                <div className="overflow-x-auto overflow-y-hidden bg-gray-lightest px-4" ref={containerRef}>
                    <div style={{ width: '100%' }} ref={innerRef} className="transition relative">
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

export default connectPlayer((state: any) => ({
    resourceList: state.resourceList,
    exceptionsList: state.exceptionsList,
    eventsList: state.eventList,
    endTime: state.endTime,
}))(OverviewPanel);

const VerticalPointerLine = connectPlayer((state: any) => ({
    time: state.time,
    scale: 100 / state.endTime,
}))(({ time, scale }: any) => {
    const left = time * scale;
    return <div className="absolute border-r border-red border-dotted z-10" style={{ left: `${left}%`, height: '250px', width: '1px' }} />;
});
