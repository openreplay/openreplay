import React from 'react';
import {Card, Space, Typography, Button} from "antd";
import {useStore} from "App/mstore";
import {eventKeys} from "Types/filter/newFilter";
import {CLICKMAP, FUNNEL, INSIGHTS, RETENTION, TABLE, USER_PATH} from "App/constants/card";
import FilterSeries from "Components/Dashboard/components/FilterSeries/FilterSeries";
import {metricOf} from "App/constants/filterOptions";
import {AudioWaveform, ChevronDown, ChevronUp, PlusIcon} from "lucide-react";
import {observer} from "mobx-react-lite";
import AddStepButton from "Components/Dashboard/components/FilterSeries/AddStepButton";

function WidgetFormNew() {
    // const [expanded, setExpanded] = React.useState(true);
    const {metricStore, dashboardStore, aiFiltersStore} = useStore();
    const metric: any = metricStore.instance;

    const eventsLength = metric.series[0].filter.filters.filter((i: any) => i && i.isEvent).length;
    const filtersLength = metric.series[0].filter.filters.filter((i: any) => i && !i.isEvent).length;
    const isClickMap = metric.metricType === CLICKMAP;
    const isPathAnalysis = metric.metricType === USER_PATH;
    const excludeFilterKeys = isClickMap || isPathAnalysis ? eventKeys : [];
    const hasFilters = filtersLength > 0 || eventsLength > 0;

    return (
        <>
            <Card
                styles={{
                    body: {padding: '0'},
                    cover: {}
                }}
            >
                {!hasFilters && (
                    <DefineSteps metric={metric} excludeFilterKeys={excludeFilterKeys}/>
                )}
            </Card>

            {hasFilters && (
                <FilterSection metric={metric} excludeFilterKeys={excludeFilterKeys}/>
            )}
        </>
    );
}

export default observer(WidgetFormNew);


function DefineSteps({metric, excludeFilterKeys}: any) {
    return (
        <Space className="px-4 py-2">
            <Typography.Text strong>Define Steps</Typography.Text>
            <AddStepButton excludeFilterKeys={excludeFilterKeys} series={metric.series[0]}/>
        </Space>
    );
}


const FilterSection = observer(({metric, excludeFilterKeys}: any) => {
    // const timeseriesOptions = metricOf.filter((i) => i.type === 'timeseries');
    // const tableOptions = metricOf.filter((i) => i.type === 'table');
    const isTable = metric.metricType === TABLE;
    const isClickMap = metric.metricType === CLICKMAP;
    const isFunnel = metric.metricType === FUNNEL;
    const isInsights = metric.metricType === INSIGHTS;
    const isPathAnalysis = metric.metricType === USER_PATH;
    const isRetention = metric.metricType === RETENTION;
    const canAddSeries = metric.series.length < 3;
    const eventsLength = metric.series[0].filter.filters.filter((i: any) => i && i.isEvent).length;
    // const cannotSaveFunnel = isFunnel && (!metric.series[0] || eventsLength <= 1);

    const isSingleSeries = isTable || isFunnel || isClickMap || isInsights || isRetention

    // const onAddFilter = (filter: any) => {
    //     metric.series[0].filter.addFilter(filter);
    //     metric.updateKey('hasChanged', true)
    // }

    return (
        <>
            {
                metric.series.length > 0 && metric.series
                    .slice(0, isSingleSeries ? 1 : metric.series.length)
                    .map((series: any, index: number) => (
                        <div className='mb-2' key={series.name}>
                            <FilterSeries
                                canExclude={isPathAnalysis}
                                supportsEmpty={!isClickMap && !isPathAnalysis}
                                excludeFilterKeys={excludeFilterKeys}
                                observeChanges={() => metric.updateKey('hasChanged', true)}
                                hideHeader={isTable || isClickMap || isInsights || isPathAnalysis || isFunnel}
                                seriesIndex={index}
                                series={series}
                                onRemoveSeries={() => metric.removeSeries(index)}
                                canDelete={metric.series.length > 1}
                                emptyMessage={
                                    isTable
                                        ? 'Filter data using any event or attribute. Use Add Step button below to do so.'
                                        : 'Add user event or filter to define the series by clicking Add Step.'
                                }
                                expandable={isSingleSeries}
                            />
                        </div>
                    ))
            }

            {!isSingleSeries && canAddSeries && (
                <Card styles={{body: {padding: '4px'}}}>
                    <Button
                        type='link'
                        onClick={() => {
                            metric.addSeries();

                        }}
                        disabled={!canAddSeries}
                        size="small"
                    >
                        <Space>
                            <AudioWaveform size={16}/>
                            New Chart Series
                        </Space>
                    </Button>
                </Card>
            )}
        </>
    );
})
