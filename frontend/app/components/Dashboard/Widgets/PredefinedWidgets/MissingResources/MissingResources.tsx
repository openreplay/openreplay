import React from 'react';
import { NoContent } from 'UI';
import { Styles, Table } from '../../common';
import { List } from 'immutable';

import Chart from './Chart';
import ResourceInfo from './ResourceInfo';
import CopyPath from './CopyPath';

const cols = [
  {
    key: 'resource',
    title: 'Resource',
    Component: ResourceInfo,
    width: '40%',
  },
  {
    key: 'sessions',
    title: 'Sessions',
    toText: count => `${ count > 1000 ? Math.trunc(count / 1000) : count }${ count > 1000 ? 'k' : '' }`,
    width: '20%',
  },
  {
    key: 'trend',
    title: 'Trend',
    Component: Chart,
    width: '20%',
  },
  {
    key: 'copy-path',
    title: '',
    Component: CopyPath,
    cellClass: 'invisible group-hover:visible text-right',
    width: '20%',
  }
];

interface Props {
    data: any
    metric?: any
    isTemplate?: boolean
}
function MissingResources(props: Props) {
    const { data, metric, isTemplate } = props;

    return (
        <NoContent
          title="No resources missing."
          size="small"
          show={ metric.data.chart.length === 0 }
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
