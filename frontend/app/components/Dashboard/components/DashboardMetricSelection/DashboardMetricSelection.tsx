import React, { useEffect } from 'react';
import WidgetWrapper from '../WidgetWrapper';
import { useObserver } from 'mobx-react-lite';
import { Icon } from 'UI';
import cn from 'classnames';
import { useStore } from 'App/mstore';
import { Loader } from 'UI';

interface IWiProps {
    category: Record<string, any>
    onClick: (category: Record<string, any>) => void
    isSelected: boolean
    selectedWidgetIds: string[]
}

const ICONS: Record<string, string | null> = {
    errors: 'errors-icon',
    performance: 'performance-icon',
    resources: 'resources-icon',
    overview: null,
    custom: null,
    'web vitals': 'web-vitals',
}

export function WidgetCategoryItem({ category, isSelected, onClick, selectedWidgetIds }: IWiProps) {
    const selectedCategoryWidgetsCount = useObserver(() => {
        return category.widgets.filter((widget: any) => selectedWidgetIds.includes(widget.metricId)).length;
    });
    return (
        <div
            className={cn("rounded p-4 border cursor-pointer hover:bg-active-blue", { 'bg-active-blue border-blue':isSelected, 'bg-white': !isSelected })}
            onClick={() => onClick(category)}
        >
            <div className="font-medium text-lg mb-2 capitalize flex items-center">
                {/* @ts-ignore */}
                {ICONS[category.name] && <Icon name={ICONS[category.name]} size={18} className="mr-2" />}
                {category.name}
            </div>
            <div className="mb-2 text-sm leading-tight">{category.description}</div>
            {selectedCategoryWidgetsCount > 0 && (
                <div className="flex items-center">
                    <span className="color-gray-medium text-sm">{`Selected ${selectedCategoryWidgetsCount} of ${category.widgets.length}`}</span>
                </div>
            )}
        </div>
    );
}

interface IProps {
    handleCreateNew?: () => void;
    isDashboardExists?: boolean;
}

function DashboardMetricSelection(props: IProps) {
    const { dashboardStore } = useStore();
    let widgetCategories: any[] = useObserver(() => dashboardStore.widgetCategories);
    const loadingTemplates = useObserver(() => dashboardStore.loadingTemplates);
    const [activeCategory, setActiveCategory] = React.useState<any>();
    const [selectAllCheck, setSelectAllCheck] = React.useState(false);
    const selectedWidgetIds = useObserver(() => dashboardStore.selectedWidgets.map((widget: any) => widget.metricId));
    const scrollContainer = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        dashboardStore?.fetchTemplates(true).then((categories) => {
            setActiveCategory(categories[0]);
        });
    }, []);

    useEffect(() => {
        if (scrollContainer.current) {
            scrollContainer.current.scrollTop = 0;
        }
    }, [activeCategory, scrollContainer.current]);

    const handleWidgetCategoryClick = (category: any) => {
        setActiveCategory(category);
        setSelectAllCheck(false);
    };

    const toggleAllWidgets = ({ target: { checked }}) => {
        setSelectAllCheck(checked);
        if (checked) {
            dashboardStore.selectWidgetsByCategory(activeCategory.name);
        } else {
            dashboardStore.removeSelectedWidgetByCategory(activeCategory);
        }
    }

    return useObserver(() => (
        <Loader loading={loadingTemplates}>
            <div className="grid grid-cols-12 gap-4 my-3 items-end">
                <div className="col-span-3">
                    <div className="uppercase color-gray-medium text-lg">Type</div>
                </div>

                <div className="col-span-9 flex items-center">
                   {activeCategory && (
                       <>
                            <div className="flex items-baseline">
                                <h2 className="text-2xl capitalize">{activeCategory.name}</h2>
                                <span className="text-2xl color-gray-medium ml-2">{activeCategory.widgets.length}</span>
                            </div>

                            <div className="ml-auto">
                                <label className="flex items-center ml-3 cursor-pointer select-none">
                                    <input type="checkbox" onChange={toggleAllWidgets} checked={selectAllCheck} />
                                    <div className="ml-2">Select All</div>
                                </label>
                            </div>
                        </>
                   )}
                </div>
            </div>
            <div className="grid grid-cols-12 gap-4">
                <div className="col-span-3">
                    <div className="grid grid-cols-1 gap-4 py-1 pr-2" style={{ maxHeight: `calc(100vh - ${props.isDashboardExists ? 175 : 300}px)`, overflowY: 'auto' }}>
                        {activeCategory && widgetCategories.map((category, index) =>
                            <WidgetCategoryItem
                                key={category.name}
                                onClick={handleWidgetCategoryClick}
                                category={category}
                                isSelected={activeCategory.name === category.name}
                                selectedWidgetIds={selectedWidgetIds}
                            />
                        )}
                    </div>
                </div>
                <div className="col-span-9">
                    <div
                        className="grid grid-cols-4 gap-4 -mx-4 px-4 pb-40 items-start py-1"
                        style={{ maxHeight: "calc(100vh - 170px)", overflowY: 'auto' }}
                        ref={scrollContainer}
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
                        {props.isDashboardExists && activeCategory?.name === 'custom' && (
                             <div
                                className={
                                    cn(
                                        "relative rounded border col-span-1 cursor-pointer",
                                        "flex flex-col items-center justify-center bg-white",
                                        "hover:bg-active-blue hover:shadow-border-main text-center py-16",
                                    )
                                }
                                onClick={props.handleCreateNew}
                            >
                                <Icon name="plus" size="16" />
                                <span className="mt-2">Create Metric</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Loader>
    ));
}

export default DashboardMetricSelection;
