import React from 'react';
import WidgetWrapper from '../../WidgetWrapper';
import { useDashboardStore } from '../../store/store';
import { useObserver } from 'mobx-react-lite';
import cn from 'classnames';
import { Button } from 'UI';

function WidgetCategoryItem({ category, isSelected, onClick, selectedWidgetIds, unSelectCategory }) {
    const selectedCategoryWidgetsCount = useObserver(() => {
        return category.widgets.filter(widget => selectedWidgetIds.includes(widget.widgetId)).length;
    });
    return (
        <div
            className={cn("rounded p-4 shadow border cursor-pointer", { 'bg-active-blue border-color-teal':isSelected, 'bg-white': !isSelected })}
            onClick={() => onClick(category)}
        >
            <div className="font-medium text-lg mb-2">{category.name}</div>
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
    const store: any = useDashboardStore();
    const widgetCategories = store?.widgetCategories;
    const widgetTemplates = store?.widgetTemplates;
    const [activeCategory, setActiveCategory] = React.useState<any>(widgetCategories[0]);
    const [selectedWidgets, setSelectedWidgets] = React.useState<any>([]);
    const selectedWidgetIds = selectedWidgets.map((widget: any) => widget.widgetId);

    const removeSelectedWidgetByCategory = (category: any) => {
        const categoryWidgetIds = category.widgets.map((widget: any) => widget.widgetId);
        const newSelectedWidgets = selectedWidgets.filter((widget: any) => !categoryWidgetIds.includes(widget.widgetId));
        setSelectedWidgets(newSelectedWidgets);
    };

    const toggleWidgetSelection = (widget: any) => {
        console.log('toggleWidgetSelection', widget.widgetId);
        if (selectedWidgetIds.includes(widget.widgetId)) {
            setSelectedWidgets(selectedWidgets.filter((w: any) => w.widgetId !== widget.widgetId));
        } else {
            setSelectedWidgets(selectedWidgets.concat(widget));
        }
    };

    const handleWidgetCategoryClick = (category: any) => {
        setActiveCategory(category);
    };

    const toggleAllWidgets = ({ target: { checked }}) => {
        if (checked == true) {
            const allWidgets = widgetCategories.reduce((acc, category) => {
                return acc.concat(category.widgets);
            }, []);

            setSelectedWidgets(allWidgets);
        } else {
            setSelectedWidgets([]);
        }
    }

    return useObserver(() => (
        <div >
            <div className="grid grid-cols-12 gap-4 my-3 items-end">
                <div className="col-span-3">
                    <div className="uppercase color-gray-medium text-lg">Categories</div>
                </div>

                <div className="col-span-9 flex items-center">
                    <div className="flex items-center">
                        <h2 className="text-2xl">Errors Tracking</h2>
                        <span className="text-2xl color-gray-medium ml-2">12</span>
                    </div>

                    <div className="ml-auto flex items-center">
                        <span className="color-gray-medium">Showing past 7 days data for visual clue</span>
                        <div className="flex items-center ml-3">
                            <input type="checkbox" onChange={toggleAllWidgets} />
                            <span className="ml-2">Select All</span>
                        </div>
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-12 gap-4">
                <div className="col-span-3">
                    <div className="grid grid-cols-1 gap-4">
                        {widgetCategories.map((category, index) =>
                            <WidgetCategoryItem
                                key={category.categoryId}
                                onClick={handleWidgetCategoryClick}
                                category={category}
                                isSelected={activeCategory.categoryId === category.categoryId}
                                selectedWidgetIds={selectedWidgetIds}
                                unSelectCategory={removeSelectedWidgetByCategory}
                            />
                        )}
                    </div>
                </div>
                <div className="col-span-9">
                    <div className="grid grid-cols-2 gap-4 -mx-4 px-4 lg:grid-cols-2 sm:grid-cols-1">
                        {activeCategory.widgets.map((widget: any) => (
                            <div
                                key={widget.widgetId}
                                className={cn("border rounded cursor-pointer", { 'border-color-teal' : selectedWidgetIds.includes(widget.widgetId) })}
                                onClick={() => toggleWidgetSelection(widget)}
                            >
                                <WidgetWrapper widget={widget} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    ));
}

export default DashboardMetricSelection;