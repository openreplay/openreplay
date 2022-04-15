import React from 'react';
import { Loader, NoContent } from 'UI';
import { Styles, Table } from '../../common';
import { getRE } from 'App/utils';
import ImageInfo from './ImageInfo';
import MethodType from './MethodType';
import cn from 'classnames';
import stl from './callWithErrors.css';

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

interface Props {
    data: any
    metric?: any
}
function CallWithErrors(props: Props) {
    const { data, metric } = props;
    const [search, setSearch] = React.useState('')
    const test = (value = '', serach) => getRE(serach, 'i').test(value);
    const _data = search ? metric.data.chart.filter(i => test(i.urlHostpath, search)) : metric.data.chart.images;

    const write = ({ target: { name, value } }) => {
      setSearch(value)
    };

    return (
        
        <NoContent
          size="small"
          show={ metric.data.chart.length === 0 }
          style={{ height: '240px'}}
        >
          <div style={{ height: '240px'}}>
            <div className={ cn(stl.topActions, 'py-3 flex text-right')}>
              <input disabled={metric.data.chart.length === 0} className={stl.searchField} name="search" placeholder="Filter by Path" onChange={write} />
            </div>
            <Table
              cols={ cols }
              rows={ _data }
            />
          </div>
        </NoContent>
   );
}

export default CallWithErrors;