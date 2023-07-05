import Modal from 'App/components/Modal/Modal';
import React from 'react';
import MetricTypeList from '../MetricTypeList';

interface Props {
  siteId: string;
  dashboardId?: string;
}
function AddCardModal(props: Props) {
  return (
    <>
      <Modal.Header title="Add Card" />
      <Modal.Content className="px-3 pb-6">
        <MetricTypeList siteId={props.siteId} dashboardId={parseInt(props.dashboardId as string)} isList={true} />
      </Modal.Content>
    </>
  );
}

export default AddCardModal;
