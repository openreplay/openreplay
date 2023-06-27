import Modal from 'App/components/Modal/Modal';
import React, { useEffect, useState } from 'react';
import MetricsList from '../MetricsList';
import { Icon } from 'UI';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import FooterContent from './FooterContent';

interface Props {
  dashboardId?: number;
  siteId: string;
}
function MetricsLibraryModal(props: Props) {
  const { metricStore } = useStore();
  const { siteId, dashboardId } = props;
  const [selectedList, setSelectedList] = useState([]);

  useEffect(() => {
    metricStore.updateKey('page', 1)
    metricStore.updateKey('listView', true);

    return () => {
      metricStore.updateKey('filter', { ...metricStore.filter, query: '' })
    }
  }, []);

  const onSelectionChange = (list: any) => {
    setSelectedList(list);
  };

  const onChange = ({ target: { value } }: any) => {
    metricStore.updateKey('filter', { ...metricStore.filter, query: value })
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
        <FooterContent dashboardId={dashboardId} selected={selectedList} />
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
