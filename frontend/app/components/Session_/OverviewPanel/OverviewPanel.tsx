import { connectPlayer, Controls } from 'App/player';
import React, { useEffect } from 'react';
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

    const createEventClickHandler = (pointer: any) => (e: any) => {
        console.log('here...');
        e.stopPropagation();
        Controls.jump(pointer.time);
        // props.setTimelinePointer(pointer);
    };

    let width = 100;
    const SPEED = 5;
    const onWheel = (e: any) => {
        e.preventDefault();
        e.stopPropagation();
        // console.log('e', e)

        // horizontal
        if (e.deltaX != '-0') {
            // e.preventDefault();
            console.log('e.deltaX', e.deltaX);
        }
        // Vertical
        if (e.deltaY != '-0') {
            console.log('e.deltaY', e.deltaY);
            // e.preventDefault();
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
        }
    };

    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.addEventListener('wheel', onWheel, { passive: false });
        }

        return () => {
            if (containerRef.current) {
                containerRef.current.removeEventListener('wheel', onWheel);
            }
        };
    }, []);

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
                <div onClick={createEventClickHandler(item)} className="cursor-pointer">
                    <div className="h-2 w-2 rounded-full bg-red" onClick={createEventClickHandler(item)} />
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
                <div onClick={createEventClickHandler(item)} className="cursor-pointer">
                    <Icon className="bg-white" name="funnel/emoji-angry" color="red" size="16" onClick={createEventClickHandler(item)} />
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
                <div onClick={createEventClickHandler(item)} className="cursor-pointer">
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
    resourceList: state.resourceList.filter((r: any) => r.isRed() || r.isYellow()),
    exceptionsList: state.exceptionsList,
    eventsList: state.eventList,
    endTime: state.endTime,
}))(OverviewPanel);

const VerticalPointerLine = connectPlayer((state: any) => ({
    time: state.time,
    scale: 100 / state.endTime,
}))(({ time, scale }: any) => {
    const left = time * scale;
    return <div className="absolute border-r border-teal border-dashed z-10" style={{ left: `${left}%`, height: '250px', width: '1px' }} />;
});
