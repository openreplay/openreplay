import React, {useState} from 'react';
import FilterList from 'Shared/Filters/FilterList';
import SeriesName from './SeriesName';
import cn from 'classnames';
import {observer} from 'mobx-react-lite';
import ExcludeFilters from './ExcludeFilters';
import AddStepButton from "Components/Dashboard/components/FilterSeries/AddStepButton";
import {Button, Space} from "antd";
import {ChevronDown, ChevronUp, Trash} from "lucide-react";


const FilterCountLabels = observer((props: { filters: any, toggleExpand: any }) => {
    const events = props.filters.filter((i: any) => i && i.isEvent).length;
    const filters = props.filters.filter((i: any) => i && !i.isEvent).length;
    return <div className="flex items-center">
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
    </div>;
});

const FilterSeriesHeader = observer((props: {
    expanded: boolean,
    hidden: boolean,
    seriesIndex: number,
    series: any,
    onRemove: (seriesIndex: any) => void,
    canDelete: boolean | undefined,
    toggleExpand: () => void
}) => {

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
            {!props.expanded &&
                <FilterCountLabels filters={props.series.filter.filters} toggleExpand={props.toggleExpand}/>}
        </Space>

        <Space>
            <Button onClick={props.onRemove}
                    size="small"
                    disabled={!props.canDelete}
                    icon={<Trash size={14}/>}/>
            <Button onClick={props.toggleExpand}
                    size="small"
                    icon={props.expanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}/>
        </Space>
    </div>;
})

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
    expandable?: boolean;
}

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
        expandable = false
    } = props;
    const [expanded, setExpanded] = useState(!expandable);
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
        console.log(name, value)
        series.filter.updateKey(name, value);
        observeChanges();
    };

    const onRemoveFilter = (filterIndex: any) => {
        series.filter.removeFilter(filterIndex);
        observeChanges();
    };

    return (
        <div className="border rounded-lg shadow-sm bg-white">
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

            {expandable && !expanded && (
                <Space className="justify-between w-full px-5 py-2">
                    <FilterCountLabels filters={series.filter.filters} toggleExpand={() => setExpanded(!expanded)}/>
                    <Button onClick={() => setExpanded(!expanded)}
                            size="small"
                            icon={expanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}/>
                </Space>
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
                                actions={[
                                    expandable && (
                                        <Button onClick={() => setExpanded(!expanded)}
                                                size="small"
                                                icon={expanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}/>
                                    )
                                ]}
                            />
                        ) : (
                            <div className="color-gray-medium">{emptyMessage}</div>
                        )}
                    </div>
                    <div className="border-t h-12 flex items-center">
                        <div className="-mx-4 px-5">
                            <AddStepButton excludeFilterKeys={excludeFilterKeys} series={series}/>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default observer(FilterSeries);
