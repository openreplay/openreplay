import React from 'react';
import { Loader, NoContent, DropdownPlain } from 'UI';
import { Table, widgetHOC } from '../common';
import Chart from './Chart';
import ImageInfo from './ImageInfo';
import { getRE } from 'App/utils';
import cn from 'classnames';
import stl from './SlowestResources.module.css';
import ResourceType from './ResourceType';
import CopyPath from './CopyPath';
import { numberWithCommas } from 'App/utils';

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
const WIDGET_KEY = 'slowestResources'

@widgetHOC(WIDGET_KEY, { fitContent: true })
export default class SlowestResources extends React.PureComponent {
  state = { resource: 'all', search: ''}

  test = (key, value = '') => getRE(key, 'i').test(value);

  write = ({ target: { name, value } }) => {
    this.setState({ [ name ]: value })
  };

  writeOption = (e, { name, value }) => {
    this.setState({ [ name ]: value })
    this.props.fetchWidget(WIDGET_KEY, this.props.period, this.props.platform, { [ name ]: value === 'all' ? null : value  })
  }

  render() {
    const { data, loading, compare, isTemplate } = this.props;

    return (
      <div>
        <div className={ cn(stl.topActions, 'py-3 flex text-right')}>
          <DropdownPlain
            name="type"
            label="Resource"
            options={ RESOURCE_OPTIONS }
            onChange={ this.writeOption }
          />
        </div>
        <Loader loading={ loading } size="small">
          <NoContent
            size="small"
            show={ data.size === 0 }
            title="No recordings found"
          >
            <Table cols={ cols } rows={ data } isTemplate={isTemplate} rowClass="group" compare={compare} />
          </NoContent>
        </Loader>
      </div>
    );
  }
}
