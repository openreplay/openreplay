import React from 'react';
import { Button} from 'UI';
import { confirmable } from 'react-confirm';
import { Modal } from 'UI'
 
const Confirmation = ({
  show,
  proceed,
  header = 'Confirm',
  confirmation = 'Are you sure?',
  cancelButton = "Cancel",
  confirmButton = "Proceed",
}) => {
  return (
    <Modal
      open={show}
    >
      <Modal.Header>{header}</Modal.Header>
      <Modal.Content>
        <p>{confirmation}</p>
      </Modal.Content>
      <Modal.Footer>
        <Button
          onClick={() => proceed(true)}
          variant="primary"
          className="mr-2"
        >
            {confirmButton}
        </Button>

        <Button
          onClick={() => proceed(false)}
        >
            {cancelButton}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
 
export default confirmable(Confirmation);