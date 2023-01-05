import React from 'react';
import { Icon, PageTitle, Button, Link, SegmentSelection } from 'UI';
import MetricsSearch from '../MetricsSearch';
import Select from 'Shared/Select';
import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';

function MetricViewHeader() {
  const { metricStore } = useStore();
  const sort = useObserver(() => metricStore.sort);
  const listView = useObserver(() => metricStore.listView);

  
  return (
    <div>
      <div className="flex items-center mb-4 justify-between px-6">
        <div className="flex items-baseline mr-3">
          <PageTitle title="Cards" className="" />
        </div>
        <div className="ml-auto flex items-center">
          <Link to={'/metrics/create'}>
            <Button variant="primary">New Card</Button>
          </Link>
          <SegmentSelection
              name="viewType"
              className="mx-3"
              primary              
              onSelect={ () => metricStore.updateKey('listView', !listView) }
              value={{ value: listView ? 'list' : 'grid' }}
              list={ [
                  { value: 'list', name: '', icon: 'graph-up-arrow' },
                  { value: 'grid', name: '', icon: 'hash' },
              ]}
          />
          <div className="mx-2">
            <Select
              options={[
                { label: 'Newest', value: 'desc' },
                { label: 'Oldest', value: 'asc' },
              ]}
              defaultValue={sort.by}
              plain
              onChange={({ value }) => metricStore.updateKey('sort', { by: value.value })}
            />
          </div>
          <div className="ml-4 w-1/4" style={{ minWidth: 300 }}>
            <MetricsSearch />
          </div>
        </div>
      </div>
      <div className="text-base text-disabled-text flex items-center px-6">
        <Icon name="info-circle-fill" className="mr-2" size={16} />
        Create custom Cards to capture key interactions and track KPIs.
      </div>
    </div>
  );
}

export default MetricViewHeader;
