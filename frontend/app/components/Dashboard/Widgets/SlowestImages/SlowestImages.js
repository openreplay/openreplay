import React from 'react';
import { Loader, NoContent } from 'UI';
import { Table, widgetHOC } from '../common';
import Chart from './Chart';
import ImageInfo from './ImageInfo';

const cols = [
  {
    key: 'image',
    title: 'Image',
    Component: ImageInfo,
    width: '40%',
  },
  {
    key: 'avgDuration',
    title: 'Load Time',
    toText: time => `${ Math.trunc(time) }ms`,
    width: '25%',
  },
  {
    key: 'trend',
    title: 'Trend',
    Component: Chart,
    width: '20%',
  },
  {
    key: 'sessions',
    title: 'Sessions',
    width: '15%',
    toText: count => `${ count > 1000 ? Math.trunc(count / 1000) : count }${ count > 1000 ? 'k' : '' }`,
    className: 'text-left'
  },
];

@widgetHOC('slowestImages', { fitContent: true })
export default class SlowestImages extends React.PureComponent {
  render() {
    const { data: images, loading } = this.props;
    return (
      <Loader loading={ loading } size="small">
        <NoContent
          size="small"
          show={ images.size === 0 }
          title="No recordings found"
        >
          <Table
            cols={ cols }
            rows={ images }
          />
        </NoContent>
      </Loader>
    );
  }
}
