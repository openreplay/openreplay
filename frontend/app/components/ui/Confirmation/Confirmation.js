import React from 'react';
import { Button} from 'UI';
import { confirmable } from 'react-confirm';
import { Confirm } from 'semantic-ui-react';
import stl from './confirmation.module.css';
 
const Confirmation = ({
  show,
  proceed,
  header = 'Confirm',
  confirmation = 'Are you sure?',
  cancelButton = "Cancel",
  confirmButton = "Proceed",
  options
}) => {
  return (
    <Confirm
      dimmer
      centered={false}
      open={show}
      size="mini"
      content={confirmation}
      header={header}
      className="confirmCustom"
      confirmButton={<Button variant="primary" id="confirm-button" className="ml-0" primary>{ confirmButton }</Button>}
      cancelButton={<Button id="cancel-button">{ cancelButton }</Button>}
      onCancel={() => proceed(false)}
      onConfirm={() => proceed(true)}
    />
  )
}
 
export default confirmable(Confirmation);