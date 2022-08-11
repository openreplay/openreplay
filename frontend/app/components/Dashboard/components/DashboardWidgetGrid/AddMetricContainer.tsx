import React from 'react';
import { observer } from 'mobx-react-lite';
import { Icon } from 'UI';
import { useModal } from 'App/components/Modal';
import { useStore } from 'App/mstore';
import AddMetric from './AddMetric';
import AddPredefinedMetric from './AddPredefinedMetric';
import cn from 'classnames';

interface AddMetricButtonProps {
    iconName: string;
    title: string;
    description: string;
    isPremade?: boolean;
    onClick: () => void;
}

function AddMetricButton({ iconName, title, description, onClick, isPremade }: AddMetricButtonProps) {
    return (
        <div
            onClick={onClick}
            className={cn(
                'px-4 py-8 flex items-center flex-col hover:bg-gray-lightest group rounded border cursor-pointer',
                isPremade ? 'bg-figmaColors-primary-outlined-hover-background' : 'bg-figmaColors-secondary-outlined-hover-background'
            )}
            style={{ borderColor: 'rgb(238, 238, 238)' }}
        >
            <div
                className={cn(
                    'p-6 my-3 rounded-full group-hover:bg-gray-light',
                    isPremade ? 'bg-figmaColors-primary-outlined-hover-background' : 'bg-figmaColors-secondary-outlined-hover-background'
                )}
            >
                <Icon
                    name={iconName}
                    size={26}
                    className="group-hover:fill-gray-medium"
                    style={{ fill: isPremade ? '#3EAAAF' : 'rgba(63, 81, 181, 0.5)' }}
                />
            </div>
            <div className="font-bold mb-2 text-figmaColors-text-primary">{title}</div>
            <div className="text-disabled-test w-2/3 text-center text-figmaColors-text-primary">{description}</div>
        </div>
    );
}

function AddMetricContainer({ siteId }: any) {
    const { showModal } = useModal();
    const [categories, setCategories] = React.useState<Record<string, any>[]>([]);
    const { dashboardStore } = useStore();

    React.useEffect(() => {
        dashboardStore?.fetchTemplates(true).then((cats) => setCategories(cats));
    }, []);

    const onAddCustomMetrics = () => {
        dashboardStore.initDashboard(dashboardStore.selectedDashboard);
        showModal(
            <AddMetric
                siteId={siteId}
                title="Custom Metrics"
                description="Metrics that are manually created by you or your team."
                metrics={categories.find((category) => category.name === 'custom')?.widgets}
            />,
            { right: true }
        );
    };

    const onAddPredefinedMetrics = () => {
        dashboardStore.initDashboard(dashboardStore.selectedDashboard);
        showModal(
            <AddPredefinedMetric
                siteId={siteId}
                title="Ready-Made Metrics"
                description="Curated metrics predfined by OpenReplay."
                categories={categories.filter((category) => category.name !== 'custom')}
            />,
            { right: true }
        );
    };
    return (
        <div style={{ borderColor: 'rgb(238, 238, 238)', height: 300 }} className="bg-white border border-dashed rounded p-8 grid grid-cols-2 gap-8">
            <AddMetricButton
                title="+ Add custom Metric"
                description="Metrics that are manually created by you or your team"
                iconName="bar-pencil"
                onClick={onAddCustomMetrics}
                isPremade
            />
            <AddMetricButton
                title="+ Add Ready-Made Metric"
                description="Curated metrics predfined by OpenReplay."
                iconName="grid-check"
                onClick={onAddPredefinedMetrics}
            />
        </div>
    );
}

export default observer(AddMetricContainer);
