import React, { useEffect } from 'react';
import { PageTitle, Icon } from 'UI';
import { Segmented, Button, Popover } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import AddCardSection from '../AddCardSection/AddCardSection';
import MetricsSearch from '../MetricsSearch';
import Select from 'Shared/Select';
import { useStore } from 'App/mstore';
import { observer, useObserver } from 'mobx-react-lite';
import { DROPDOWN_OPTIONS } from 'App/constants/card';

function MetricViewHeader() {
  const { metricStore } = useStore();
  const filter = metricStore.filter;
  const [showAddCardModal, setShowAddCardModal] = React.useState(false);
  const modalBgRef = React.useRef<HTMLDivElement>(null);

  // Set the default sort order to 'desc'
  useEffect(() => {
    metricStore.updateKey('sort', { by: 'desc' });
  }, [metricStore]);

  return (
    <div>
      <div className="flex items-center justify-between px-6">
        <div className="flex items-baseline mr-3">
          <PageTitle title="Cards" className="" />
        </div>
        <div className="ml-auto flex items-center">
          <Popover arrow={false} overlayInnerStyle={{ padding: 0, borderRadius: '0.75rem' }} content={<AddCardSection fit inCards />} trigger={'click'}>
            <Button
              type="primary"
              onClick={() => setShowAddCardModal(true)}
              icon={<PlusOutlined />}
            >
              Create Card
            </Button>
          </Popover>
          <div className="ml-4 w-1/4" style={{ minWidth: 300 }}>
            <MetricsSearch />
          </div>
        </div>
      </div>

      <div className="border-y px-6 py-1 mt-2 flex items-center w-full justify-between">
        <div className="items-center flex gap-4">
          <Select
            options={[
              { label: 'All Types', value: 'all' },
              ...DROPDOWN_OPTIONS,
            ]}
            name="type"
            defaultValue={filter.type}
            onChange={({ value }) =>
              metricStore.updateKey('filter', { ...filter, type: value.value })
            }
            plain={true}
            isSearchable={true}
          />

          <DashboardDropdown
            plain={false}
            onChange={(value: any) =>
              metricStore.updateKey('filter', { ...filter, dashboard: value })
            }
          />
        </div>

        <div className="flex items-center gap-6">
          <ListViewToggler />

          {/* <Toggler
                        label='My Cards'
                        checked={filter.showMine}
                        name='test'
                        className='font-medium mr-2'
                        onChange={() =>
                            metricStore.updateKey('filter', { ...filter, showMine: !filter.showMine })
                        }
                    /> */}
        </div>
      </div>
    </div>
  );
}

export default observer(MetricViewHeader);

function DashboardDropdown({
  onChange,
  plain = false,
}: {
  plain?: boolean;
  onChange: (val: any) => void;
}) {
  const { dashboardStore, metricStore } = useStore();
  const dashboardOptions = dashboardStore.dashboards.map((i, l) => ({
    key: `${i.dashboardId}_${l}`,
    label: i.name,
    value: i.dashboardId,
  }));

  return (
    <Select
      isSearchable={true}
      placeholder="Filter by Dashboard"
      plain={plain}
      options={dashboardOptions}
      value={metricStore.filter.dashboard}
      onChange={({ value }: any) => onChange(value)}
      isMulti={true}
      color="black"
    />
  );
}

function ListViewToggler() {
  const { metricStore } = useStore();
  const listView = useObserver(() => metricStore.listView);
  return (
    <div className="flex items-center">
      <Segmented
        size="small"
        options={[
          {
            label: (
              <div className={'flex items-center gap-2'}>
                <Icon name={'list-alt'} color={'inherit'} />
                <div>List</div>
              </div>
            ),
            value: 'list',
          },
          {
            label: (
              <div className={'flex items-center gap-2'}>
                <Icon name={'grid'} color={'inherit'} />
                <div>Grid</div>
              </div>
            ),
            value: 'grid',
          },
        ]}
        onChange={(val) => {
          metricStore.updateKey('listView', val === 'list');
        }}
        value={listView ? 'list' : 'grid'}
      />
    </div>
  );
}
