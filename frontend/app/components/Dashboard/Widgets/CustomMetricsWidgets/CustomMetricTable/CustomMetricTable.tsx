import React from 'react'
import { Table } from '../../common';
import { List } from 'immutable';

const cols = [
    {
      key: 'name',
      title: 'Resource',
      toText: name => name,
      width: '70%',
    },
    {
      key: 'sessions',
      title: 'Sessions',
      toText: sessions => sessions,
      width: '30%',
    },
];

interface Props {
    data: any;
}
function CustomMetriTable(props: Props) {
    const { data } = props;
    const rows = List([
        { name: 'one', sessions: 2 },
        { name: 'two', sessions: 3 },
        { name: 'three', sessions: 4 },
        { name: 'four', sessions: 1 },
        { name: 'five', sessions: 6 },
    ])
    return (
        <div className="flex flex-col items-center justify-center" style={{ height: '240px'}}>
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
