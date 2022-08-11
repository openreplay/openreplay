import React from 'react';
import cn from 'classnames'
import { getTimelinePosition } from 'App/utils';
import { connectPlayer } from 'App/player';

interface Props {
    list?: any[];
    title: string;
    className?: string;
    endTime?: number;
    renderElement?: (item: any) => React.ReactNode;
}
const EventRow = React.memo((props: Props) => {
    const { title, className, list = [], endTime = 0 } = props;
    const scale = 100 / endTime;
    const _list = React.useMemo(() => {
        return list.map((item: any, _index: number) => {
            return {
                ...item.toJS(),
                left: getTimelinePosition(item.time, scale),
            }
        })
    }, [list]);
    return (
        <div className={cn('w-full flex flex-col py-2', className)} style={{ height: '66px'}}>
            <div className="uppercase color-gray-medium ml-4">{title}</div>
            <div className="relative w-full py-3">
                {_list.map((item: any, index: number) => {
                    return (
                        <div key={index} className="absolute" style={{ left: item.left + '%'}} >
                            {props.renderElement ? props.renderElement(item) : null}
                        </div>
                    )
                }
            )}
            </div>
        </div>
    );
});

export default connectPlayer((state: any) => ({
    endTime: state.endTime,
}))(EventRow);