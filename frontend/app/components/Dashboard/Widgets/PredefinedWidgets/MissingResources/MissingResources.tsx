import React from 'react';
import { NoContent } from 'UI';
import { Styles, Table } from '../../common';
import { List } from 'immutable';

import Chart from './Chart';
import ResourceInfo from './ResourceInfo';
import CopyPath from './CopyPath';

const cols: Array<Object> = [
  {
    key: 'resource',
    title: 'Resource',
    Component: ResourceInfo,
    width: '40%',
  },
  {
    key: 'sessions',
    title: 'Sessions',
    toText: (count: number) => `${ count > 1000 ? Math.trunc(count / 1000) : count }${ count > 1000 ? 'k' : '' }`,
    width: '20%',
  },
  {
    key: 'trend',
    title: 'Trend',
    Component: Chart,
    width: '20%',
  }
];

const copyPathCol = {
  key: 'copy-path',
  title: '',
  Component: CopyPath,
  cellClass: 'invisible group-hover:visible text-right',
  width: '20%',
}

interface Props {
    data: any
    metric?: any
    isTemplate?: boolean
}
function MissingResources(props: Props) {
    const { data, metric, isTemplate } = props;

    if (!isTemplate) {
      cols.push(copyPathCol);
    }

    console.log('metric.data.chart', metric.data.chart);
    
    return (
        <NoContent
          title="No resources missing"
          size="small"
          show={ metric.data.chart.length === 0 }
          style={{ minHeight: 220 }}
        >
          <div style={{ height: '240px'}}>
            <Table
              small
              cols={ cols }
              rows={ List(metric.data.chart) }
              rowClass="group"
              isTemplate={isTemplate}
            />
          </div>
        </NoContent>
    );
}

export default MissingResources;
