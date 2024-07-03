import React, { useEffect } from 'react';
import Widget from 'App/mstore/types/widget';
import Funnelbar, { UxTFunnelBar } from "./FunnelBar";
import cn from 'classnames';
import stl from './FunnelWidget.module.css';
import { observer } from 'mobx-react-lite';
import { NoContent, Icon } from 'UI';
import { Tag, Tooltip } from 'antd';
import { useModal } from 'App/components/Modal';

interface Props {
    metric?: Widget;
    isWidget?: boolean;
    data: any;
}
function FunnelWidget(props: Props) {
    const [focusedFilter, setFocusedFilter] = React.useState<number | null>(null);
    const { isWidget = false, data } = props;
    const funnel = data.funnel || { stages: [] };
    const totalSteps = funnel.stages.length;
    const stages = isWidget ? [...funnel.stages.slice(0, 1), funnel.stages[funnel.stages.length - 1]] : funnel.stages;
    const hasMoreSteps = funnel.stages.length > 2;
    const lastStage = funnel.stages[funnel.stages.length - 1];
    const remainingSteps = totalSteps - 2;
    const { hideModal } = useModal();

    useEffect(() => {
        return () => {
            if (isWidget) return;
            hideModal();
        }
    }, []);

    const focusStage = (index: number) => {
        funnel.stages.forEach((s, i) => {
            // turning on all filters if one was focused already
            if (focusedFilter === index) {
                s.updateKey('isActive', true)
                setFocusedFilter(null)
            } else {
                setFocusedFilter(index)
                if (i === index) {
                    s.updateKey('isActive', true)
                } else {
                    s.updateKey('isActive', false)
                }
            }
        })
    }

    return (
        <NoContent
            style={{ minHeight: 220 }}
            title={
                <div className="flex items-center text-lg">
                    <Icon name="info-circle" className="mr-2" size="18" />
                    No data available for the selected period.
                </div>
            }
            show={!stages || stages.length === 0}
        >
            <div className="w-full">
                { !isWidget && (
                    stages.map((filter: any, index: any) => (
                        <Stage
                          key={index}
                          index={index + 1}
                          isWidget={isWidget}
                          stage={filter}
                          focusStage={focusStage}
                          focusedFilter={focusedFilter}
                        />
                    ))
                )}

                { isWidget && (
                    <>
                        <Stage index={1} isWidget={isWidget} stage={stages[0]} />

                        { hasMoreSteps && (
                            <>
                                <EmptyStage total={remainingSteps} />
                            </>
                        )}

                        {funnel.stages.length > 1 && (
                            <Stage index={totalSteps} isWidget={isWidget} stage={lastStage} />
                        )}
                    </>
                )}
            </div>
            <div className="flex items-center pb-4">
                <div className="flex items-center">
                    <span className="text-base font-medium mr-2">Lost conversion</span>
                    <Tooltip title={`${funnel.lostConversions} Sessions ${funnel.lostConversionsPercentage}%`}>
                        <Tag bordered={false} color="red" className='text-lg font-medium rounded-lg'>
                        {funnel.lostConversions}
                        </Tag>
                    </Tooltip>
                </div>
                <div className="mx-3" />
                <div className="flex items-center">
                    <span className="text-base font-medium mr-2">Total conversion</span>
                    <Tooltip title={`${funnel.totalConversions} Sessions ${funnel.totalConversionsPercentage}%`}>
                        <Tag bordered={false} color="cyan" className='text-lg font-medium rounded-lg'>
                        {funnel.totalConversions}
                        </Tag>
                    </Tooltip>
                </div>
            </div>
            {funnel.totalDropDueToIssues > 0 && <div className="flex items-center mb-2"><Icon name="magic" /> <span className="ml-2">{funnel.totalDropDueToIssues} sessions dropped due to issues.</span></div>}
        </NoContent>
    );
}

export const EmptyStage = observer(({ total }: any) => {
    return (
        <div className={cn("flex items-center mb-4 pb-3", stl.step)}>
            <IndexNumber index={0} />
            <div className="w-fit px-2 border border-teal py-1 text-center justify-center bg-teal-lightest flex items-center rounded-full color-teal" style={{ width: '100px'}}>
                {`+${total} ${total > 1 ? 'steps' : 'step'}`}
            </div>
            <div className="border-b w-full border-dashed"></div>
        </div>
    )
})

export const Stage = observer(({ stage, index, isWidget, uxt, focusStage, focusedFilter }: any) => {
    return stage ? (
        <div
          className={cn('flex items-start', stl.step, { [stl['step-disabled']]: !stage.isActive })}
        >
          <IndexNumber index={index} />
          {!uxt ? <Funnelbar index={index} filter={stage} focusStage={focusStage} focusedFilter={focusedFilter} /> : <UxTFunnelBar filter={stage} />}
          {/*{!isWidget && !uxt && <BarActions bar={stage} />}*/}
        </div>
      ) : (
        <></>
      )
})

export const IndexNumber = observer(({ index }: any) => {
    return (
        <div className="z-10 w-6 h-6 border shrink-0 mr-4 text-sm rounded-full bg-gray-lightest flex items-center justify-center leading-3">
            {index === 0 ? <Icon size="14" color="gray-dark" name="list" /> : index}
        </div>
    );
})


const BarActions = observer(({ bar }: any) => {
    return (
        <div className="self-end flex items-center justify-center ml-4" style={{ marginBottom: '49px'}}>
            <button onClick={() => bar.updateKey('isActive', !bar.isActive)}>
                <Icon name="eye-slash-fill" color={bar.isActive ? "gray-light" : "gray-darkest"} size="22" />
            </button>
        </div>
    )
})

export default observer(FunnelWidget);
