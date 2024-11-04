import React from 'react';
import { observer } from 'mobx-react-lite';
import { Icon } from 'UI';
import { useModal } from 'App/components/Modal';
import { useStore } from 'App/mstore';
import AddMetric from './AddMetric';
import AddPredefinedMetric from './AddPredefinedMetric';
import cn from 'classnames';

interface AddMetricButtonProps {
    iconName: "bar-pencil" | "grid-check";
    title: string;
    description: string;
    isPremade?: boolean;
    isPopup?: boolean;
    onClick: () => void;
}

function AddMetricButton({ iconName, title, description, onClick, isPremade, isPopup }: AddMetricButtonProps) {
    return (
        <div
            onClick={onClick}
            className={cn(
                'flex items-center hover:bg-gray-lightest  group rounded border cursor-pointer',
                isPremade ? 'bg-figmaColors-primary-outlined-hover-background hover:!border-tealx' : 'hover:!border-teal bg-figmaColors-secondary-outlined-hover-background',
                isPopup ? 'p-4 z-50' : 'px-4 py-8 flex-col'
            )}
            style={{ borderColor: 'rgb(238, 238, 238)' }}
        >
            <div
                className={cn(
                    'p-6 my-3 rounded-full group-hover:bg-gray-light',
                    isPremade
                        ? 'bg-figmaColors-primary-outlined-hover-background fill-figmaColors-accent-secondary group-hover:!bg-figmaColors-accent-secondary group-hover:!fill-white'
                        : 'bg-figmaColors-secondary-outlined-hover-background fill-figmaColors-secondary-outlined-resting-border group-hover:!bg-teal group-hover:!fill-white'
                )}
            >
                <Icon name={iconName} size={26} style={{ fill: 'inherit' }} />
            </div>
            <div className={isPopup ? 'flex flex-col text-left ml-4' : 'flex flex-col text-center items-center'}>
                <div className="font-bold text-base text-figmaColors-text-primary">{title}</div>
                <div className={cn('text-disabled-test text-figmaColors-text-primary text-base', isPopup ? 'w-full' : 'mt-2 w-2/3 text-center')}>
                    {description}
                </div>
            </div>
        </div>
    );
}

interface Props {
    siteId: string
    isPopup?: boolean
    onAction?: () => void
}

function AddMetricContainer({ siteId, isPopup, onAction }: Props) {
    const { showModal } = useModal();
    const { dashboardStore } = useStore();

    const onAddCustomMetrics = () => {
        onAction?.()
        dashboardStore.initDashboard(dashboardStore.selectedDashboard);
        showModal(
            <AddMetric
                siteId={siteId}
                title="Custom Metrics"
                description="Metrics that are manually created by you or your team."
            />,
            { right: true }
        );
    };

    const onAddPredefinedMetrics = () => {
        onAction?.()
        dashboardStore.initDashboard(dashboardStore.selectedDashboard);
        showModal(
            <AddPredefinedMetric
                siteId={siteId}
                title="Ready-Made Metrics"
                description="Curated metrics predfined by OpenReplay."
            />,
            { right: true }
        );
    };

    const classes = isPopup
        ? 'bg-white border rounded p-4 grid grid-rows-2 gap-4'
        : 'bg-white border border-dashed hover:!border-gray-medium rounded p-8 grid grid-cols-2 gap-8';
    return (
        <div style={{ borderColor: 'rgb(238, 238, 238)', height: isPopup ? undefined : 300 }} className={classes}>
            <AddMetricButton
                title="+ Add Custom Metric"
                description="Metrics that are manually created by you or your team"
                iconName="bar-pencil"
                onClick={onAddCustomMetrics}
                isPremade
                isPopup={isPopup}
            />
            <AddMetricButton
                title="+ Add Ready-Made Metric"
                description="Curated metrics predfined by OpenReplay."
                iconName="grid-check"
                onClick={onAddPredefinedMetrics}
                isPopup={isPopup}
            />
        </div>
    );
}

export default observer(AddMetricContainer);
