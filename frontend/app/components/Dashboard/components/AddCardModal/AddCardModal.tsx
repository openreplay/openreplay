import Modal from 'App/components/Modal/Modal';
import React from 'react';
import MetricTypeList from '../MetricTypeList';

interface Props {
  siteId: string;
  dashboardId: string;
}
function AddCardModal(props: Props) {
  return (
    <>
      <Modal.Header title="Add Card" />
      <Modal.Content className="p-0">
        <MetricTypeList siteId={props.siteId} dashboardId={props.dashboardId} />
      </Modal.Content>
    </>
  );
}

export default AddCardModal;
