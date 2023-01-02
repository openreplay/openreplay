import Modal from 'App/components/Modal/Modal';
import React, { useEffect, useMemo, useState } from 'react';
import MetricsList from '../MetricsList';
import { Button } from 'UI';
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
    metricStore.updateKey('listView', true)
  }, [])

  const onSelectionChange = (list: any) => {
    setSelectedList(list);
  };

  return (
    <>
      <Modal.Header title="Cards Library" />
      <Modal.Content>
        <div className="border">
          <MetricsList siteId={siteId} onSelectionChange={onSelectionChange} />
        </div>
        <SelectedContent dashboardId={dashboardId} selected={selectedList} />
      </Modal.Content>
    </>
  );
}

export default observer(MetricsLibraryModal);

function SelectedContent({ dashboardId, selected }: any) {
  const { hideModal } = useModal();
  const { metricStore, dashboardStore } = useStore();
  const total = useObserver(() => metricStore.sortedWidgets.length);
  const dashboard = useMemo(() => dashboardStore.getDashboard(dashboardId), [dashboardId]);

  const addSelectedToDashboard = () => {
    dashboardStore.addWidgetToDashboard(dashboard, selected).then(hideModal);
  };

  return (
    <div className="flex items-center rounded border bg-gray-light-shade absolute justify-between p-3 left-4 right-4 bottom-4">
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
