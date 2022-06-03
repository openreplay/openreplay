import React from 'react'
import { Table } from '../../common';
import { List } from 'immutable';
import { filtersMap } from 'Types/filter/newFilter';
import { NoContent } from 'UI';
import { tableColumnName } from 'App/constants/filterOptions';
import { numberWithCommas } from 'App/utils';

const getColumns = (metric) => {
    return [
        {
          key: 'name',
          title: tableColumnName[metric.metricOf],
          toText: name => name || 'Unidentified',
          width: '70%',
        },
        {
          key: 'sessionCount',
          title: 'Sessions',
          toText: sessions => numberWithCommas(sessions),
          width: '30%',
        },
    ]
}

interface Props {
    metric?: any,
    data: any;
    onClick?: (filters) => void;
    isTemplate?: boolean;
}
function CustomMetriTable(props: Props) {
    const { metric = {}, data = { values: [] }, onClick = () => null, isTemplate } = props;
    const rows = List(data.values);

    const onClickHandler = (event, data) => {
        const filters = Array<any>();
        let filter = { ...filtersMap[metric.metricOf] }
        filter.value = [data.name]
        filter.type = filter.key
        delete filter.key
        delete filter.operatorOptions
        delete filter.category
        delete filter.icon
        delete filter.label
        delete filter.options

        filters.push(filter);
        onClick(filters);
    }
    return (
        <div className="" style={{ height: '240px'}}>
           <NoContent show={data.values && data.values.length === 0} size="small">
                <Table
                    small
                    cols={ getColumns(metric) }
                    rows={ rows }
                    rowClass="group"
                    onRowClick={ onClickHandler }
                    isTemplate={isTemplate}
                />
           </NoContent>
        </div>
    )
}

export default CustomMetriTable;
