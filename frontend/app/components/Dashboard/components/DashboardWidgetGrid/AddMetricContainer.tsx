import React from 'react';
import { observer } from 'mobx-react-lite';
import { Icon } from 'UI';
import { useModal } from 'App/components/Modal';
import { useStore } from 'App/mstore';
import AddMetric from './AddMetric';
import AddPredefinedMetric from './AddPredefinedMetric';

interface AddMetricButtonProps {
    iconName: string;
    title: string;
    description: string;
    onClick: () => void;
}

function AddMetricButton({ iconName, title, description, onClick }: AddMetricButtonProps) {
    return (
        <div
            onClick={onClick}
            className="px-4 py-8 flex items-center flex-col bg-tealx-lightest hover:bg-active-blue group border-teal-light border cursor-pointer"
        >
            <div className="p-4 mb-2 bg-gray-light rounded-full group-hover:bg-teal-light">
                <Icon name={iconName} size={26} />
            </div>
            <div className="font-bold mb-2">{title}</div>
            <div className="text-disabled-test w-2/3">{description}</div>
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
        <div className="bg-white rounded p-8 grid grid-cols-2 gap-4 w-4/5 m-auto">
            <AddMetricButton
                title="+ Add custom Metric"
                description="Metrics that are manually created by you or your team"
                iconName="bar-chart-line"
                onClick={onAddCustomMetrics}
            />
            <AddMetricButton
                title="+ Add Ready-Made Metric"
                description="Curated metrics predfined by OpenReplay."
                iconName="bar-chart-line"
                onClick={onAddPredefinedMetrics}
            />
        </div>
    );
}

export default observer(AddMetricContainer);
