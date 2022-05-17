import { Loader, NoContent } from 'UI';
import { Table, widgetHOC } from '../common';
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

@widgetHOC('missingResources', {  })
export default class MissingResources extends React.PureComponent {
  render() {
    const { data: resources, loading, compare } = this.props;
    return (
      <Loader loading={ loading } size="small">
        <NoContent
          title="No resources missing."
          size="small"
          show={ resources.size === 0 }
        >
          <Table
            small
            cols={ cols }
            rows={ resources }
            rowClass="group"
            compare={compare}
            isTemplate={this.props.isTemplate}
          />
        </NoContent>
      </Loader>
    );
  }
}
