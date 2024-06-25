import React, {useState} from 'react';
import FilterList from 'Shared/Filters/FilterList';
import {Icon} from 'UI';
import SeriesName from './SeriesName';
import cn from 'classnames';
import {observer} from 'mobx-react-lite';
import ExcludeFilters from './ExcludeFilters';
import AddStepButton from "Components/Dashboard/components/FilterSeries/AddStepButton";
import {Button, Space} from "antd";
import {ChevronDown, ChevronUp, Trash} from "lucide-react";

interface Props {
    seriesIndex: number;
    series: any;
    onRemoveSeries: (seriesIndex: any) => void;
    canDelete?: boolean;
    supportsEmpty?: boolean;
    hideHeader?: boolean;
    emptyMessage?: any;
    observeChanges?: () => void;
    excludeFilterKeys?: Array<string>;
    canExclude?: boolean;
}

const FilterSeriesHeader = observer((props: {
    expanded: boolean,
    hidden: boolean,
    seriesIndex: number,
    series: any,
    onRemove: (seriesIndex: any) => void,
    canDelete: boolean | undefined,
    toggleExpand: () => void
}) => {
    const events = props.series.filter.filters.filter((i: any) => i && i.isEvent).length;
    const filters = props.series.filter.filters.filter((i: any) => i && !i.isEvent).length;
    const onUpdate = (name: any) => {
        props.series.update('name', name)
    }
    return <div className={cn("border-b px-5 h-12 flex items-center relative", {hidden: props.hidden})}>
        <Space className="mr-auto" size={30}>
            <SeriesName
                seriesIndex={props.seriesIndex}
                name={props.series.name}
                onUpdate={onUpdate}
            />
            {!props.expanded && (
                <Space>
                    {events > 0 && (
                        <Button type="primary" ghost size="small" onClick={props.toggleExpand}>
                            {`${events} Event${events > 1 ? 's' : ''}`}
                        </Button>
                    )}

                    {filters > 0 && (
                        <Button type="primary" ghost size="small" onClick={props.toggleExpand}>
                            {`${filters} Filter${filters > 1 ? 's' : ''}`}
                        </Button>
                    )}
                </Space>
            )}

            {/*{events === 0 && filters === 0 && !props.expanded && (*/}
            {/*    <AddStepButton series={props.series} excludeFilterKeys={[]}/>*/}
            {/*)}*/}
        </Space>

        <Space>
            <Button onClick={props.onRemove}
                    size="small"
                    disabled={!props.canDelete}
                    icon={<Trash size={16}/>}/>
            <Button onClick={props.toggleExpand}
                    size="small"
                    icon={props.expanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}/>
        </Space>
    </div>;
})

function FilterSeries(props: Props) {
    const {
        observeChanges = () => {
        },
        canDelete,
        hideHeader = false,
        emptyMessage = 'Add user event or filter to define the series by clicking Add Step.',
        supportsEmpty = true,
        excludeFilterKeys = [],
        canExclude = false,
    } = props;
    const [expanded, setExpanded] = useState(true);
    const {series, seriesIndex} = props;

    const onUpdateFilter = (filterIndex: any, filter: any) => {
        series.filter.updateFilter(filterIndex, filter);
        observeChanges();
    };

    const onFilterMove = (newFilters: any) => {
        series.filter.replaceFilters(newFilters.toArray())
        observeChanges();
    }

    const onChangeEventsOrder = (_: any, {name, value}: any) => {
        series.filter.updateKey(name, value);
        observeChanges();
    };

    const onRemoveFilter = (filterIndex: any) => {
        series.filter.removeFilter(filterIndex);
        observeChanges();
    };

    return (
        <div className="border rounded bg-white">
            {canExclude && <ExcludeFilters filter={series.filter}/>}

            {!hideHeader && (
                <FilterSeriesHeader hidden={hideHeader}
                                    seriesIndex={seriesIndex}
                                    series={series}
                                    onRemove={props.onRemoveSeries}
                                    canDelete={canDelete}
                                    expanded={expanded}
                                    toggleExpand={() => setExpanded(!expanded)}/>
            )}

            {expanded && (
                <>
                    <div className="p-5">
                        {series.filter.filters.length > 0 ? (
                            <FilterList
                                filter={series.filter}
                                onUpdateFilter={onUpdateFilter}
                                onRemoveFilter={onRemoveFilter}
                                onChangeEventsOrder={onChangeEventsOrder}
                                supportsEmpty={supportsEmpty}
                                onFilterMove={onFilterMove}
                                excludeFilterKeys={excludeFilterKeys}
                            />
                        ) : (
                            <div className="color-gray-medium">{emptyMessage}</div>
                        )}
                    </div>
                    <div className="border-t h-12 flex items-center">
                        <div className="-mx-4 px-6">
                            <AddStepButton excludeFilterKeys={excludeFilterKeys} series={series}/>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default observer(FilterSeries);
