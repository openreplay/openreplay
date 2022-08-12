import React from 'react';
import { Loader, NoContent } from 'UI';
import { Table, widgetHOC } from '../common';
import { getRE } from 'App/utils';
import ImageInfo from './ImageInfo';
import MethodType from './MethodType';
import cn from 'classnames';
import stl from './callWithErrors.module.css';

const cols = [
  {
    key: 'method',
    title: 'Method',
    className: 'text-left',
    Component: MethodType,
    cellClass: 'ml-2',
    width: '8%',
  },
  {
    key: 'urlHostpath',
    title: 'Path',
    Component: ImageInfo,
    width: '40%',
  },
  {
    key: 'allRequests',
    title: 'Requests',
    className: 'text-left',
    width: '15%',
  },
  {
    key: '4xx',
    title: '4xx',
    className: 'text-left',
    width: '15%',
  },
  {
    key: '5xx',
    title: '5xx',
    className: 'text-left',
    width: '15%',
  }
];

@widgetHOC('callsErrors', { fitContent: true })
export default class CallWithErrors extends React.PureComponent {
  state = { search: ''}

  test = (value = '', serach) => getRE(serach, 'i').test(value);

  write = ({ target: { name, value } }) => {
    this.setState({ [ name ]: value })
  };

  render() {
    const { data: images, loading } = this.props;
    const { search } = this.state;
    const _data = search ? images.filter(i => this.test(i.urlHostpath, search)) : images;

    return (
      <Loader loading={ loading } size="small">
        <div className={ cn(stl.topActions, 'py-3 flex text-right')}>
          <input disabled={images.size === 0} className={stl.searchField} name="search" placeholder="Filter by Path" onChange={this.write} />
        </div>
        <NoContent
          size="small"
          title="No recordings found"
          show={ images.size === 0 }
        >
          <Table
            cols={ cols }
            rows={ _data }
            isTemplate={this.props.isTemplate}
          />
        </NoContent>
      </Loader>
    );
  }
}
