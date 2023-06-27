import React from 'react';
import { PageTitle, Button, Link, Toggler } from 'UI';
import MetricsSearch from '../MetricsSearch';
import Select from 'Shared/Select';
import { useStore } from 'App/mstore';
import { observer, useObserver } from 'mobx-react-lite';
import { DROPDOWN_OPTIONS } from 'App/constants/card';
import AddCardModal from 'Components/Dashboard/components/AddCardModal';
import { useModal } from 'Components/Modal';

function MetricViewHeader({ siteId }: { siteId: string }) {
  const { metricStore } = useStore();
  const filter = metricStore.filter;
  const { showModal } = useModal();

  return (
    <div>
      <div className='flex items-center justify-between px-6'>
        <div className='flex items-baseline mr-3'>
          <PageTitle title='Cards' className='' />
        </div>
        <div className='ml-auto flex items-center'>
          <Button variant='primary'
                  onClick={() => showModal(<AddCardModal siteId={siteId} />, { right: true })}
          >New Card</Button>
          <div className='ml-4 w-1/4' style={{ minWidth: 300 }}>
            <MetricsSearch />
          </div>
        </div>
      </div>

      <div className='border-y px-6 py-1 mt-2 flex items-center w-full justify-between'>
        <div className='items-center flex gap-4'>
          <Toggler
            label='My Cards'
            checked={filter.showMine}
            name='test'
            className='font-medium mr-2'
            onChange={() =>
              metricStore.updateKey('filter', { ...filter, showMine: !filter.showMine })
            }
          />
          <Select
            options={[{ label: 'All Types', value: 'all' }, ...DROPDOWN_OPTIONS]}
            name='type'
            defaultValue={filter.type}
            onChange={({ value }) =>
              metricStore.updateKey('filter', { ...filter, type: value.value })
            }
            plain={true}
            isSearchable={true}
          />

          <DashboardDropdown
            plain={true}
            onChange={(value: any) =>
              metricStore.updateKey('filter', { ...filter, dashboard: value })
            }
          />
        </div>

        <div className='flex items-center'>
          <ListViewToggler />

          <Select
            options={[
              { label: 'Newest', value: 'desc' },
              { label: 'Oldest', value: 'asc' }
            ]}
            name='sort'
            defaultValue={metricStore.sort.by}
            onChange={({ value }) => metricStore.updateKey('sort', { by: value.value })}
            plain={true}
            className='ml-4'
          />
        </div>
      </div>
    </div>
  );
}

export default observer(MetricViewHeader);

function DashboardDropdown({ onChange, plain = false }: { plain?: boolean; onChange: any }) {
  const { dashboardStore, metricStore } = useStore();
  const dashboardOptions = dashboardStore.dashboards.map((i: any) => ({
    key: i.id,
    label: i.name,
    value: i.dashboardId
  }));

  return (
    <Select
      isSearchable={true}
      placeholder='Filter by Dashboard'
      plain={plain}
      options={dashboardOptions}
      value={metricStore.filter.dashboard}
      onChange={({ value }: any) => onChange(value)}
      isMulti={true}
    />
  );
}

function ListViewToggler({}) {
  const { metricStore } = useStore();
  const listView = useObserver(() => metricStore.listView);
  return (
    <div className='flex items-center'>
      <Button
        icon='list-alt'
        variant={listView ? 'text-primary' : 'text'}
        onClick={() => metricStore.updateKey('listView', true)}
      >
        List
      </Button>
      <Button
        icon='grid'
        variant={!listView ? 'text-primary' : 'text'}
        onClick={() => metricStore.updateKey('listView', false)}
      >
        Grid
      </Button>
    </div>
  );
}
