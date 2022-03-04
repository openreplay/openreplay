import React from 'react'
import { Table } from '../../common';
import { List } from 'immutable';
import { FilterKey } from 'Types/filter/filterType';
import { filtersMap } from 'Types/filter/newFilter';
import { NoContent } from 'UI';

const cols = [
    {
      key: 'name',
      title: 'Resource',
      toText: name => name || 'Unidentified',
      width: '70%',
    },
    {
      key: 'sessionCount',
      title: 'Sessions',
      toText: sessions => sessions,
      width: '30%',
    },
];

interface Props {
    metric?: any,
    data: any;
    onClick?: (filters) => void;
}
function CustomMetriTable(props: Props) {
    const { metric = {}, data = { values: [] }, onClick = () => null } = props;
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
                    cols={ cols }
                    rows={ rows }
                    rowClass="group"
                    onRowClick={ onClickHandler }
                />
           </NoContent>
        </div>
    )
}

export default CustomMetriTable;
