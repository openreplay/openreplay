import React, { useEffect } from 'react';
import WidgetWrapper from '../WidgetWrapper';
import { useObserver } from 'mobx-react-lite';
import cn from 'classnames';
import { useStore } from 'App/mstore';

function WidgetCategoryItem({ category, isSelected, onClick, selectedWidgetIds, unSelectCategory }) {
    const selectedCategoryWidgetsCount = useObserver(() => {
        return category.widgets.filter(widget => selectedWidgetIds.includes(widget.metricId)).length;
    });
    return (
        <div
            className={cn("rounded p-4 shadow border cursor-pointer", { 'bg-active-blue border-color-teal':isSelected, 'bg-white': !isSelected })}
            onClick={() => onClick(category)}
        >
            <div className="font-medium text-lg mb-2 capitalize">{category.name}</div>
            <div className="mb-2">{category.description}</div>
            {selectedCategoryWidgetsCount > 0 && (
                <div className="flex items-center">
                    <input type="checkbox" checked={true} onChange={() => unSelectCategory(category)} />
                    <span className="color-gray-medium ml-2">{`Selected ${selectedCategoryWidgetsCount} of ${category.widgets.length}`}</span>
                </div>
            )}
        </div>
    );
}

function DashboardMetricSelection(props) {
    const { dashboardStore } = useStore();
    let widgetCategories: any[] = useObserver(() => dashboardStore.widgetCategories);
    const [activeCategory, setActiveCategory] = React.useState<any>();
    const selectedWidgetIds = useObserver(() => dashboardStore.selectedWidgets.map((widget: any) => widget.metricId));

    useEffect(() => {
        dashboardStore?.fetchTemplates().then(templates => {
            setActiveCategory(dashboardStore.widgetCategories[0]);
        });
    }, []);

    const handleWidgetCategoryClick = (category: any) => {
        setActiveCategory(category);
    };

    const toggleAllWidgets = ({ target: { checked }}) => {
        dashboardStore.toggleAllSelectedWidgets(checked);
    }

    return useObserver(() => (
        <div >
            <div className="grid grid-cols-12 gap-4 my-3 items-end">
                <div className="col-span-3">
                    <div className="uppercase color-gray-medium text-lg">Categories</div>
                </div>

                <div className="col-span-9 flex items-center">
                   {activeCategory && (
                       <>
                            <div className="flex items-baseline">
                                <h2 className="text-2xl capitalize">{activeCategory.name}</h2>
                                <span className="text-2xl color-gray-medium ml-2">{activeCategory.widgets.length}</span>
                            </div>

                            <div className="ml-auto flex items-center">
                                <span className="color-gray-medium">Showing past 7 days data for visual clue</span>
                                <div className="flex items-center ml-3">
                                    <input type="checkbox" onChange={toggleAllWidgets} />
                                    <span className="ml-2">Select All</span>
                                </div>
                            </div>
                        </>
                   )}
                </div>
            </div>
            <div className="grid grid-cols-12 gap-4">
                <div className="col-span-3">
                    <div className="grid grid-cols-1 gap-4">
                        {activeCategory && widgetCategories.map((category, index) =>
                            <WidgetCategoryItem
                                key={category.name}
                                onClick={handleWidgetCategoryClick}
                                category={category}
                                isSelected={activeCategory.name === category.name}
                                selectedWidgetIds={selectedWidgetIds}
                                unSelectCategory={dashboardStore.removeSelectedWidgetByCategory}
                            />
                        )}
                    </div>
                </div>
                <div className="col-span-9">
                    <div
                        className="grid grid-cols-4 gap-4 -mx-4 px-4 pb-40 items-start"
                        style={{ maxHeight: "calc(100vh - 165px)", overflowY: 'auto' }}
                    >
                        {activeCategory && activeCategory.widgets.map((widget: any) => (
                            <WidgetWrapper
                                key={widget.metricId}
                                widget={widget}
                                active={selectedWidgetIds.includes(widget.metricId)}
                                isTemplate={true}
                                isWidget={widget.metricType === 'predefined'}
                                onClick={() => dashboardStore.toggleWidgetSelection(widget)}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    ));
}

export default DashboardMetricSelection;