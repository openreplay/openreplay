import React from 'react';
import { connectPlayer, Controls } from 'App/player';
import { toggleBottomBlock, NETWORK, EXCEPTIONS } from 'Duck/components/player';
import { useModal } from 'App/components/Modal';
import { Icon, ErrorDetails } from 'UI';
import { Tooltip } from 'react-tippy';
import { TYPES as EVENT_TYPES } from 'Types/session/event';

interface Props {
    pointer: any;
    type: any;
}
function TimelinePointer(props: Props) {
    const { showModal } = useModal();
    const createEventClickHandler = (pointer: any, type: any) => (e: any) => {
        e.stopPropagation();
        Controls.jump(pointer.time);
        if (!type) {
            return;
        }

        if (type === EXCEPTIONS) {
            showModal(<ErrorDetails error={pointer} />, { right: true });
        }
        // props.toggleBottomBlock(type);
    };

    const renderNetworkElement = (item: any) => {
        return (
            <Tooltip
                html={
                    <div className="">
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
                    <div className="">
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
                    <div className="">
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

    const render = () => {
        const { pointer, type } = props;
        if (type === NETWORK) {
            return renderNetworkElement(pointer);
        }
        if (type === EVENT_TYPES.CLICKRAGE) {
            return renderClickRageElement(pointer);
        }
        if (type === EXCEPTIONS) {
            return renderExceptionElement(pointer);
        }
    };
    return <div>{render()}</div>;
}

export default TimelinePointer;
