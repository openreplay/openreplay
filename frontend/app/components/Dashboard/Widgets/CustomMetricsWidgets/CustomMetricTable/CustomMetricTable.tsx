import React from 'react'
import { Table } from '../../common';
import { List } from 'immutable';

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
    data: any;
    onClick?: (event, index) => void;
}
function CustomMetriTable(props: Props) {
    const { data = { values: [] }, onClick = () => null } = props;
    const rows = List(data.values);
    return (
        <div className="" style={{ height: '240px'}}>
           <Table
                small
                cols={ cols }
                rows={ rows }
                rowClass="group"
            />
        </div>
    )
}

export default CustomMetriTable;
