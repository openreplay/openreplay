import React from 'react';
import { NoContent } from 'UI';
import { Styles, Table } from '../../common';
import { List } from 'immutable';
import { numberWithCommas } from 'App/utils';

import Chart from './Chart';
import ImageInfo from './ImageInfo';
import ResourceType from './ResourceType';
import CopyPath from './CopyPath';

export const RESOURCE_OPTIONS = [
  { text: 'All', value: 'ALL', },
  { text: 'CSS', value: 'STYLESHEET', },
  { text: 'JS', value: 'SCRIPT', },
];

const cols = [
  {
    key: 'type',
    title: 'Type',
    Component: ResourceType,
    className: 'text-center justify-center',
    cellClass: 'ml-2',
    width: '8%',
  },
  {
    key: 'name',
    title: 'File Name',
    Component: ImageInfo,
    cellClass: '-ml-2',
    width: '40%',
  },
  {
    key: 'avg',
    title: 'Load Time',
    toText: avg => `${ avg ? numberWithCommas(Math.trunc(avg)) : 0} ms`,
    className: 'justify-center',
    width: '15%',
  },
  {
    key: 'trend',
    title: 'Trend',
    Component: Chart,
    width: '15%',
  },
  {
    key: 'copy-path',
    title: '',
    Component: CopyPath,
    cellClass: 'invisible group-hover:visible text-right',
    width: '15%',
  }
];

interface Props {
    data: any
    metric?: any
    isTemplate?: boolean
}
function SlowestResources(props: Props) {
    const { data, metric, isTemplate } = props;

    return (
        <NoContent
          title="No resources missing."
          size="small"
          show={ metric.data.chart.length === 0 }
        >
          <div style={{ height: '240px', marginBottom:'10px'}}>
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

export default SlowestResources;
