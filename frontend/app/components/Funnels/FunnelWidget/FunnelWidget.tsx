import React from 'react';
import Widget from 'App/mstore/types/widget';
import Funnelbar from './FunnelBar';
import cn from 'classnames';
import stl from './FunnelWidget.module.css';
import { Icon } from 'UI';
import { useObserver } from 'mobx-react-lite';

interface Props {
    metric: Widget;
}
function FunnelWidget(props: Props) {
    const { metric } = props;
    const funnel = metric.data.funnel || { stages: [] };

    return useObserver(() => (
        <>
            <div className="w-full">
                {funnel.stages.map((filter: any, index: any) => (
                    <div key={index} className={cn("flex items-start mb-4", stl.step, { [stl['step-disabled']] : !filter.isActive })}>
                        <div className="z-10 w-6 h-6 border mr-4 text-sm rounded-full bg-gray-lightest flex items-center justify-center leading-3">
                            {index + 1}
                        </div>
                        <Funnelbar key={index} filter={filter} />
                        <div className="self-end flex items-center justify-center ml-4" style={{ marginBottom: '49px'}}>
                            <button onClick={() => filter.updateKey('isActive', !filter.isActive)}>
                                <Icon name="eye-slash-fill" color={filter.isActive ? "gray-light" : "gray-darkest"} size="22" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex items-center pb-4">
                <div className="flex items-center">
                    <span className="text-xl mr-2">Lost conversions</span>
                    <div className="rounded px-2 py-1 bg-red-lightest color-red">
                        <span className="text-xl mr-2 font-medium">{funnel.lostConversions}</span>
                        <span className="text-sm">({funnel.lostConversionsPercentage}%)</span>
                    </div>
                </div>
                <div className="mx-3" />
                <div className="flex items-center">
                    <span className="text-xl mr-2">Total conversions</span>
                    <div className="rounded px-2 py-1 bg-tealx-lightest color-tealx">
                        <span className="text-xl mr-2 font-medium">{funnel.totalConversions}</span>
                        <span className="text-sm">({funnel.totalConversionsPercentage}%)</span>
                    </div>
                </div>
                <div className="mx-3" />
                <div className="flex items-center">
                    <span className="text-xl mr-2">Affected users</span>
                    <div className="rounded px-2 py-1 bg-gray-lightest">
                        <span className="text-xl font-medium">{funnel.affectedUsers}</span>
                        {/* <span className="text-sm">(12%)</span> */}
                    </div>
                </div>
            </div>
        </>
    ));
}

export default FunnelWidget;