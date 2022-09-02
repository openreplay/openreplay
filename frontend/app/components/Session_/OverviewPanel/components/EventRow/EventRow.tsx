import React from 'react';
import cn from 'classnames';
import { getTimelinePosition } from 'App/utils';
import { Icon, Popup } from 'UI';
import PerformanceGraph from '../PerformanceGraph';
interface Props {
    list?: any[];
    title: string;
    message?: string;
    className?: string;
    endTime?: number;
    renderElement?: (item: any) => React.ReactNode;
    isGraph?: boolean;
}
const EventRow = React.memo((props: Props) => {
    const { title, className, list = [], endTime = 0, isGraph = false, message = '' } = props;
    const scale = 100 / endTime;
    const _list =
        !isGraph &&
        React.useMemo(() => {
            return list.map((item: any, _index: number) => {
                const spread = item.toJS ? { ...item.toJS() } : { ...item }
                return {
                    ...spread,
                    left: getTimelinePosition(item.time, scale),
                };
            });
        }, [list]);

    return (
        <div className={cn('w-full flex flex-col py-2', className)} style={{ height: '60px' }}>
            <div className="uppercase color-gray-medium ml-4 text-sm flex items-center py-1">
                <div className="mr-2 leading-none">{title}</div>
                <RowInfo message={message} />
            </div>
            <div className="relative w-full">
                {isGraph ? (
                    <PerformanceGraph list={list} />
                ) : (
                    _list.length > 0 ? _list.map((item: any, index: number) => {
                        return (
                            <div key={index} className="absolute" style={{ left: item.left + '%' }}>
                                {props.renderElement ? props.renderElement(item) : null}
                            </div>
                        );
                    }) : (
                        <div className="ml-4 color-gray-medium text-sm pt-2">None captured.</div>
                    )
                )}
            </div>
        </div>
    );
});

export default EventRow;

function RowInfo({ message} : any) {
    return (
     <Popup content={message} delay={0}>
        <Icon name="info-circle" color="gray-medium"/>
     </Popup>   
    )
}
