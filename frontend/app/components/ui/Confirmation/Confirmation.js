import React from 'react';
import { confirmable } from 'react-confirm';
import { Modal } from 'UI';
import { Button } from 'antd';

function Confirmation({
  show,
  proceed,
  header = 'Confirm',
  confirmation = 'Are you sure?',
  cancelButton = 'Cancel',
  confirmButton = 'Proceed',
}) {
  React.useEffect(() => {
    const handleEsc = (e) =>
      (e.key === 'Escape' || e.key === 'Esc') && proceed(false);
    document.addEventListener('keydown', handleEsc, false);

    return () => {
      document.removeEventListener('keydown', handleEsc, false);
    };
  }, []);
  return (
    <Modal open={show} onClose={() => proceed(false)}>
      <Modal.Header>{header}</Modal.Header>
      <Modal.Content>
        <p>{confirmation}</p>
      </Modal.Content>
      <Modal.Footer>
        <Button onClick={() => proceed(true)} type="primary" className="mr-2">
          {confirmButton}
        </Button>

        <Button onClick={() => proceed(false)}>{cancelButton}</Button>
      </Modal.Footer>
    </Modal>
  );
}

export default confirmable(Confirmation);
