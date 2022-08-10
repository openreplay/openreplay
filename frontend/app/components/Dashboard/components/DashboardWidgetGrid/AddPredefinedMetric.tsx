import React from 'react';
import { observer } from 'mobx-react-lite';
import { Button } from 'UI';
import WidgetWrapper from 'App/components/Dashboard/components/WidgetWrapper';
import { useStore } from 'App/mstore';
import { useModal } from 'App/components/Modal';
import { dashboardMetricCreate, withSiteId } from 'App/routes';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import { WidgetCategoryItem } from 'App/components/Dashboard/components/DashboardMetricSelection/DashboardMetricSelection';

interface IProps extends RouteComponentProps {
    categories: Record<string, any>[];
    siteId: string;
    title: string;
    description: string;
}

function AddPredefinedMetric({ categories, history, siteId, title, description }: IProps) {
    const { dashboardStore } = useStore();
    const { hideModal } = useModal();
    const [allCheck, setAllCheck] = React.useState(false);
    const [activeCategory, setActiveCategory] = React.useState<Record<string, any>>();

    const scrollContainer = React.useRef<HTMLDivElement>(null);

    const dashboard = dashboardStore.selectedDashboard;
    const selectedWidgetIds = dashboardStore.selectedWidgets.map((widget: any) => widget.metricId);
    const queryParams = new URLSearchParams(location.search);
    const totalMetricCount = categories.reduce((acc, category) => acc + category.widgets.length, 0);

    React.useEffect(() => {
        dashboardStore?.fetchTemplates(true).then((categories) => {
            const defaultCategory = categories.filter((category: any) => category.name !== 'custom')[0];
            setActiveCategory(defaultCategory);
        });
    }, []);

    React.useEffect(() => {
        if (scrollContainer.current) {
            scrollContainer.current.scrollTop = 0;
        }
    }, [activeCategory, scrollContainer.current]);

    const handleWidgetCategoryClick = (category: any) => {
        setActiveCategory(category);
        setAllCheck(false);
    };

    const onSave = () => {
        if (selectedWidgetIds.length === 0) return;
        dashboardStore
            .save(dashboard)
            .then(async (syncedDashboard) => {
                if (dashboard.exists()) {
                    await dashboardStore.fetch(dashboard.dashboardId);
                }
                dashboardStore.selectDashboardById(syncedDashboard.dashboardId);
            })
            .then(hideModal);
    };

    const onCreateNew = () => {
        const path = withSiteId(dashboardMetricCreate(dashboard.dashboardId), siteId);
        if (!queryParams.has('modal')) history.push('?modal=addMetric');
        history.push(path);
        hideModal();
    };

    const toggleAllMetrics = ({ target: { checked } }: any) => {
        setAllCheck(checked);
        if (checked) {
            dashboardStore.selectWidgetsByCategory(activeCategory.name);
        } else {
            dashboardStore.removeSelectedWidgetByCategory(activeCategory);
        }
    };

    return (
        <div style={{ maxWidth: '85vw', width: 1200 }}>
            <div className="border-l shadow h-screen" style={{ backgroundColor: '#FAFAFA', zIndex: 999, width: '100%' }}>
                <div className="mb-6 pt-8 px-8 flex items-start justify-between">
                    <div className="flex flex-col">
                        <h1 className="text-2xl">{title}</h1>
                        <div className="text-disabled-text">{description}</div>
                    </div>
                    {title.includes('Custom') ? (
                        <div>
                            <span className="text-md link" onClick={onCreateNew}>
                                + Create new
                            </span>
                        </div>
                    ) : (
                        <div>
                            Don’t find the one you need?
                            <span className="text-md link ml-2" onClick={onCreateNew}>
                                + Create custom metric
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex px-8">
                    <div style={{ flex: 3 }}>
                        <div className="grid grid-cols-1 gap-4 py-1 pr-2" style={{ maxHeight: 'calc(100vh - 160px)', overflowY: 'auto' }}>
                            {activeCategory &&
                                categories.map((category) => (
                                    <WidgetCategoryItem
                                        key={category.name}
                                        onClick={handleWidgetCategoryClick}
                                        category={category}
                                        isSelected={activeCategory.name === category.name}
                                        selectedWidgetIds={selectedWidgetIds}
                                    />
                                ))}
                        </div>
                    </div>

                    <div
                        className="grid h-full grid-cols-4 gap-4 items-start py-1"
                        style={{ maxHeight: 'calc(100vh - 160px)', overflowY: 'auto', flex: 9 }}
                    >
                        {activeCategory &&
                            activeCategory.widgets.map((metric: any) => (
                                <WidgetWrapper
                                    key={metric.metricId}
                                    widget={metric}
                                    active={selectedWidgetIds.includes(metric.metricId)}
                                    isTemplate={true}
                                    isWidget={metric.metricType === 'predefined'}
                                    onClick={() => dashboardStore.toggleWidgetSelection(metric)}
                                />
                            ))}
                    </div>
                </div>

                <div className="py-4 border-t px-8 bg-white w-full flex items-center justify-between">
                    <div>
                        {'Selected '}
                        <span className="font-semibold">{selectedWidgetIds.length}</span>
                        {' out of '}
                        <span className="font-semibold">{totalMetricCount}</span>
                    </div>
                    <Button variant="primary" disabled={selectedWidgetIds.length === 0} onClick={onSave}>
                        Add Selected
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default withRouter(observer(AddPredefinedMetric));
