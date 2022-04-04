import React from 'react';
import DropdownPlain from 'Shared/DropdownPlain';
import { metricTypes, metricOf, issueOptions } from 'App/constants/filterOptions';
import { FilterKey } from 'Types/filter/filterType';
import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';
import { HelpText, Button, Icon } from 'UI'
import FilterSeries from '../FilterSeries';
import { withRouter } from 'react-router-dom';
import { confirm } from 'UI/Confirmation';

interface Props {
    history: any;
    match: any;
    onDelete: () => void;
}

function WidgetForm(props: Props) {
    const { history, match: { params: { siteId, dashboardId, metricId } } } = props;
    console.log('WidgetForm params', props.match.params);
    const { metricStore } = useStore();
    const metric: any = metricStore.instance;

    const timeseriesOptions = metricOf.filter(i => i.type === 'timeseries');
    const tableOptions = metricOf.filter(i => i.type === 'table');
    const isTable = metric.metricType === 'table';
    const isTimeSeries = metric.metricType === 'timeseries';
    const _issueOptions = [{ text: 'All', value: 'all' }].concat(issueOptions);

    const write = ({ target: { value, name } }) => metricStore.merge({ [ name ]: value });
    const writeOption = (e, { value, name }) => {
        metricStore.merge({ [ name ]: value });
  
      if (name === 'metricValue') {
        metricStore.merge({ metricValue: [value] });
      }
  
      if (name === 'metricOf') {
        if (value === FilterKey.ISSUE) {
            metricStore.merge({ metricValue: ['all'] });
        }
      }
  
      if (name === 'metricType') {
        if (value === 'timeseries') {
          metricStore.merge({ metricOf: timeseriesOptions[0].value, viewType: 'lineChart' });
        } else if (value === 'table') {
          metricStore.merge({ metricOf: tableOptions[0].value, viewType: 'table' });
        }
      }
    };

    const onSave = () => {
        metricStore.save(metric, dashboardId);
    }

    const onDelete = async () => {
        if (await confirm({
          header: 'Confirm',
          confirmButton: 'Yes, Delete',
          confirmation: `Are you sure you want to permanently delete this metric?`
        })) {
            metricStore.delete(metric).then(props.onDelete);
        //   props.remove(instance.alertId).then(() => {
        //     toggleForm(null, false);
        //   });
        }
    }
    
    return useObserver(() => (
        <div className="p-4">
            <div className="form-group">
                <label className="font-medium">Metric Type</label>
                <div className="flex items-center">
                    <DropdownPlain
                        name="metricType"
                        options={metricTypes}
                        value={ metric.metricType }
                        onChange={ writeOption }
                    />

                    {metric.metricType === 'timeseries' && (
                        <>
                            <span className="mx-3">of</span>
                            <DropdownPlain
                                name="metricOf"
                                options={timeseriesOptions}
                                value={ metric.metricOf }
                                onChange={ writeOption }
                            />
                        </>
                    )}

                    {metric.metricType === 'table' && (
                        <>
                            <span className="mx-3">of</span>
                            <DropdownPlain
                                name="metricOf"
                                options={tableOptions}
                                value={ metric.metricOf }
                                onChange={ writeOption }
                            />
                        </>
                    )}

                    {metric.metricOf === FilterKey.ISSUE && (
                        <>
                            <span className="mx-3">issue type</span>
                            <DropdownPlain
                            name="metricValue"
                            options={_issueOptions}
                            value={ metric.metricValue[0] }
                            onChange={ writeOption }
                            />
                        </>
                    )}

                    {metric.metricType === 'table' && (
                    <>
                        <span className="mx-3">showing</span>
                        <DropdownPlain
                        name="metricFormat"
                        options={[
                            { value: 'sessionCount', text: 'Session Count' },
                        ]}
                        value={ metric.metricFormat }
                        onChange={ writeOption }
                        />
                    </>
                    )}
                </div>
            </div>

            <div className="form-group">
                <label className="font-medium items-center">
                    {`${isTable ? 'Filter by' : 'Chart Series'}`}
                    {!isTable && (
                        <Button
                            className="ml-2"
                            primary plain size="small"
                            onClick={() => metric.addSeries()}
                        >Add Series</Button>
                    )}
                </label>

                {metric.series.length > 0 && metric.series.slice(0, isTable ? 1 : metric.series.length).map((series: any, index: number) => (
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
                        />
                    </div>
                ))}
            </div>

            <div className="form-groups flex items-center justify-between">
                <Button
                    primary
                    size="small"
                    onClick={onSave}
                >
                    Save
                </Button>
                <div className="flex items-center">
                    {metric.exists() && (
                        <>
                            <Button plain size="small" onClick={onDelete} className="flex items-center">
                                <Icon name="trash" size="14" className="mr-2" color="teal"/>
                                Delete
                            </Button>
                            <Button plain size="small" className="flex items-center ml-2">
                                <Icon name="columns-gap" size="14" className="mr-2" color="teal"/>
                                Add to Dashboard
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </div>
    ));
}

export default WidgetForm;