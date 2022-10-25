import Modal from 'App/components/Modal/Modal';
import React from 'react';
import MetricTypeList from '../MetricTypeList';

function AddCardModal() {
  return (
    <>
      <Modal.Header title="Add Card" />
      <Modal.Content className="p-0">
        <MetricTypeList />
      </Modal.Content>
    </>
  );
}

export default AddCardModal;
