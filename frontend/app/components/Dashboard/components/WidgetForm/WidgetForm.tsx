import React, { useState } from 'react';
import DropdownPlain from 'Shared/DropdownPlain';
import { metricTypes, metricOf, issueOptions } from 'App/constants/filterOptions';
import { FilterKey } from 'Types/filter/filterType';
import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';
import { Button, Icon } from 'UI'
import FilterSeries from '../FilterSeries';
import { confirm } from 'UI/Confirmation';
import Select from 'Shared/Select'
import { withSiteId, dashboardMetricDetails, metricDetails } from 'App/routes'
import DashboardSelectionModal from '../DashboardSelectionModal/DashboardSelectionModal';

interface Props {
    history: any;
    match: any;
    onDelete: () => void;
}

function WidgetForm(props: Props) {
    const [showDashboardSelectionModal, setShowDashboardSelectionModal] = useState(false);
    const { history, match: { params: { siteId, dashboardId, metricId } } } = props;
    const { metricStore, dashboardStore } = useStore();
    const dashboards = dashboardStore.dashboards;
    const isSaving = useObserver(() => metricStore.isSaving);
    const metric: any = useObserver(() => metricStore.instance)

    const timeseriesOptions = metricOf.filter(i => i.type === 'timeseries');
    const tableOptions = metricOf.filter(i => i.type === 'table');
    const isTable = metric.metricType === 'table';
    const isFunnel = metric.metricType === 'funnel';
    const isErrors = metric.metricType === 'errors';
    const isSessions = metric.metricType === 'sessions';
    const _issueOptions = [{ label: 'All', value: 'all' }].concat(issueOptions);
    const canAddToDashboard = metric.exists() && dashboards.length > 0;
    const canAddSeries = metric.series.length < 3;

    // const write = ({ target: { value, name } }) => metricStore.merge({ [ name ]: value });
    const writeOption = ({ value: { value }, name }) => {
        const obj = { [ name ]: value };
  
        if (name === 'metricValue') {
            obj['metricValue'] = [value];
        }
    
        if (name === 'metricOf') {
            if (value === FilterKey.ISSUE) {
                obj['metricValue'] = ['all'];
            }
        }
    
        if (name === 'metricType') {
            if (value === 'timeseries') {
                obj['metricOf'] = timeseriesOptions[0].value;
                obj['viewType'] = 'lineChart';
            } else if (value === 'table') {
                obj['metricOf'] = tableOptions[0].value;
                obj['viewType'] = 'table';
            }
        }

        metricStore.merge(obj);
    };

    const onSave = () => {
        const wasCreating = !metric.exists()
        metricStore.save(metric, dashboardId).then((metric) => {
            if (wasCreating) {
                if (parseInt(dashboardId) > 0) {
                    history.push(withSiteId(dashboardMetricDetails(parseInt(dashboardId), metric.metricId), siteId));
                } else {
                    history.push(withSiteId(metricDetails(metric.metricId), siteId));
                }
                
            }
        });
    }

    const onDelete = async () => {
        if (await confirm({
          header: 'Confirm',
          confirmButton: 'Yes, delete',
          confirmation: `Are you sure you want to permanently delete this metric?`
        })) {
            metricStore.delete(metric).then(props.onDelete);
        }
    }

    const onObserveChanges = () => {
        // metricStore.fetchMetricChartData(metric);
    }

    return useObserver(() => (
        <div className="p-6">
            <div className="form-group">
                <label className="font-medium">Metric Type</label>
                <div className="flex items-center">
                    <Select
                        name="metricType"
                        options={metricTypes}
                        value={metricTypes.find(i => i.value === metric.metricType) || metricTypes[0]}
                        onChange={ writeOption }
                    />
                    {/* <DropdownPlain
                        name="metricType"
                        options={metricTypes}
                        value={ metric.metricType }
                        onChange={ writeOption }
                    /> */}

                    {metric.metricType === 'timeseries' && (
                        <>
                            <span className="mx-3">of</span>
                            <Select
                                name="metricOf"
                                options={timeseriesOptions}
                                defaultValue={metric.metricOf}
                                onChange={ writeOption }
                            />
                            {/* <DropdownPlain
                                name="metricOf"
                                options={timeseriesOptions}
                                value={ metric.metricOf }
                                onChange={ writeOption }
                            /> */}
                        </>
                    )}

                    {metric.metricType === 'table' && (
                        <>
                            <span className="mx-3">of</span>
                            <Select
                                name="metricOf"
                                options={tableOptions}
                                defaultValue={metric.metricOf}
                                onChange={ writeOption }
                            />
                            {/* <DropdownPlain
                                name="metricOf"
                                options={tableOptions}
                                value={ metric.metricOf }
                                onChange={ writeOption }
                            /> */}
                        </>
                    )}

                    {metric.metricOf === FilterKey.ISSUE && (
                        <>
                            <span className="mx-3">issue type</span>
                            <Select
                                name="metricValue"
                                options={_issueOptions}
                                defaultValue={metric.metricValue[0]}
                                onChange={ writeOption }
                            />
                            {/* <DropdownPlain
                                name="metricValue"
                                options={_issueOptions}
                                value={ metric.metricValue[0] }
                                onChange={ writeOption }
                            /> */}
                        </>
                    )}

                    {metric.metricType === 'table' && (
                    <>
                        <span className="mx-3">showing</span>
                        <Select
                            name="metricFormat"
                            options={[
                                { value: 'sessionCount', label: 'Session Count' },
                            ]}
                            defaultValue={ metric.metricFormat }
                            onChange={ writeOption }
                        />
                        {/* <DropdownPlain
                            name="metricFormat"
                            options={[
                                { value: 'sessionCount', text: 'Session Count' },
                            ]}
                            value={ metric.metricFormat }
                            onChange={ writeOption }
                        /> */}
                    </>
                    )}
                </div>
            </div>

            <div className="form-group">
                <div className="font-medium items-center py-2">
                    {`${(isTable || isFunnel) ? 'Filter by' : 'Chart Series'}`}
                    {!isTable && !isFunnel && (
                        <Button
                            className="ml-2"
                            primary plain size="small"
                            onClick={() => metric.addSeries()}
                            disabled={!canAddSeries}
                        >Add Series</Button>
                    )}
                </div>

                {metric.series.length > 0 && metric.series.slice(0, (isTable || isFunnel) ? 1 : metric.series.length).map((series: any, index: number) => (
                    <div className="mb-2">
                        <FilterSeries
                            hideHeader={ isTable }
                            seriesIndex={index}
                            series={series}
                            // onRemoveSeries={() => removeSeries(index)}
                            onRemoveSeries={() => metric.removeSeries(index)}
                            canDelete={metric.series.length > 1}
                            emptyMessage={isTable ?
                                'Filter data using any event or attribute. Use Add Step button below to do so.' :
                                'Add user event or filter to define the series by clicking Add Step.'
                            }
                            // observeChanges={onObserveChanges}
                        />
                    </div>
                ))}
            </div>

            <div className="form-groups flex items-center justify-between">
                <Button
                    primary
                    size="small"
                    onClick={onSave}
                    disabled={isSaving}
                >
                    {metric.exists() ? 'Update' : 'Create'}
                </Button>
                <div className="flex items-center">
                    {metric.exists() && (
                        <>
                            <Button plain size="small" onClick={onDelete} className="flex items-center">
                                <Icon name="trash" size="14" className="mr-2" color="teal"/>
                                Delete
                            </Button>
                            <Button
                                plain size="small"
                                className="flex items-center ml-2"
                                onClick={() => setShowDashboardSelectionModal(true)}
                                disabled={!canAddToDashboard}
                            >
                                <Icon name="columns-gap" size="14" className="mr-2" color="teal"/>
                                Add to Dashboard
                            </Button>
                        </>
                    )}
                </div>
            </div>
            { canAddToDashboard && (
                <DashboardSelectionModal
                    metricId={metric.metricId}
                    show={showDashboardSelectionModal}
                    closeHandler={() => setShowDashboardSelectionModal(false)}
                />
            )}
        </div>
    ));
}

export default WidgetForm;