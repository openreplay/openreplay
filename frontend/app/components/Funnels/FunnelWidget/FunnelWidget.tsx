import React from 'react';
import Widget from 'App/mstore/types/widget';
import Funnelbar from './FunnelBar';
import cn from 'classnames';
import stl from './FunnelWidget.css';
import { Icon } from 'UI';

interface Props {
    metric: Widget;
}
function FunnelWidget(props: Props) {
    const { metric } = props;

    return (
        <>
            <div className="w-full">
                {metric.series[0].filter.filters.filter(f => f.isEvent).map((filter, index) => (
                    <div className={cn("flex items-start mb-4", stl.step, { [stl['step-disabled']] : !filter.isActive })}>
                        <div className="z-10 w-6 h-6 border mr-4 text-sm rounded-full bg-gray-lightest flex items-center justify-center leading-3">
                            {index + 1}
                        </div>
                        <Funnelbar key={index} completed={90} dropped={10} filter={filter} />
                        <div className="self-end flex items-center justify-center ml-4" style={{ marginBottom: '49px'}}>
                            <button onClick={() => filter.updateKey('isActive', !filter.isActive)}>
                                <Icon name="eye-slash-fill" color={filter.isActive ? "gray-light" : "gray-darkest"} size="22" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex items-center">
                <div className="flex items-center">
                    <span className="text-xl mr-2">Total conversions</span>
                    <div className="rounded px-2 py-1 bg-tealx-lightest color-tealx">
                        <span className="text-xl mr-2 font-medium">20</span>
                        <span className="text-sm">(12%)</span>
                    </div>
                </div>

                <div className="mx-3" />
                <div className="flex items-center">
                    <span className="text-xl mr-2">Lost conversions</span>
                    <div className="rounded px-2 py-1 bg-red-lightest color-red">
                        <span className="text-xl mr-2 font-medium">20</span>
                        <span className="text-sm">(12%)</span>
                    </div>
                </div>
            </div>
        </>
    );
}

export default FunnelWidget;