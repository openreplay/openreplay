import Modal from 'App/components/Modal/Modal';
import React, { useEffect, useMemo, useState } from 'react';
import MetricsList from '../MetricsList';
import { Button, Icon } from 'UI';
import { useModal } from 'App/components/Modal';
import { useStore } from 'App/mstore';
import { observer, useObserver } from 'mobx-react-lite';

interface Props {
  dashboardId: number;
  siteId: string;
}
function MetricsLibraryModal(props: Props) {
  const { metricStore } = useStore();
  const { siteId, dashboardId } = props;
  const [selectedList, setSelectedList] = useState([]);

  useEffect(() => {
    metricStore.updateKey('listView', true);
  }, []);

  const onSelectionChange = (list: any) => {
    setSelectedList(list);
  };

  const onChange = ({ target: { value } }: any) => {
    metricStore.updateKey('metricsSearch', value)
  };

  return (
    <>
      <Modal.Header title="Cards Library">
        <div className="flex items-center justify-between px-4 pt-4">
          <div className="text-lg flex items-center font-medium">
            <div>Cards Library</div>
          </div>
          <div>
            <MetricSearch onChange={onChange} />
          </div>
        </div>
      </Modal.Header>
      <Modal.Content className="p-4 pb-20">
        <div className="border">
          <MetricsList siteId={siteId} onSelectionChange={onSelectionChange} />
        </div>
      </Modal.Content>
      <Modal.Footer>
        <SelectedContent dashboardId={dashboardId} selected={selectedList} />
      </Modal.Footer>
    </>
  );
}

export default observer(MetricsLibraryModal);

function MetricSearch({ onChange }: any) {
  return (
    <div className="relative">
      <Icon name="search" className="absolute top-0 bottom-0 ml-2 m-auto" size="16" />
      <input
        name="dashboardsSearch"
        className="bg-white p-2 border border-borderColor-gray-light-shade rounded w-full pl-10"
        placeholder="Filter by title or owner"
        onChange={onChange}
      />
    </div>
  );
}

function SelectedContent({ dashboardId, selected }: any) {
  const { hideModal } = useModal();
  const { metricStore, dashboardStore } = useStore();
  const total = useObserver(() => metricStore.sortedWidgets.length);
  const dashboard = useMemo(() => dashboardStore.getDashboard(dashboardId), [dashboardId]);

  const addSelectedToDashboard = () => {
    if (!dashboard || !dashboard.dashboardId) return;
    dashboardStore.addWidgetToDashboard(dashboard, selected).then(() => {
      hideModal();
      dashboardStore.fetch(dashboard.dashboardId);
    });
  };

  return (
    <div className="flex items-center rounded border bg-gray-light-shade justify-between p-3">
      <div>
        Selected <span className="font-medium">{selected.length}</span> of{' '}
        <span className="font-medium">{total}</span>
      </div>
      <div className="flex items-center">
        <Button variant="text-primary" className="mr-2" onClick={hideModal}>
          Cancel
        </Button>
        <Button disabled={selected.length === 0} variant="primary" onClick={addSelectedToDashboard}>
          Add Selected to Dashboard
        </Button>
      </div>
    </div>
  );
}
