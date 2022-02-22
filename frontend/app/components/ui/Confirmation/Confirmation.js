import React from 'react';
import { Button} from 'UI';
import { confirmable } from 'react-confirm';
import { Confirm } from 'semantic-ui-react';
import stl from './confirmation.css';
 
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
      confirmButton={<Button size="small" id="confirm-button" className="ml-0" primary>{ confirmButton }</Button>}
      cancelButton={<Button size="small" id="cancel-button" plain className={ stl.cancelButton }>{ cancelButton }</Button>}
      onCancel={() => proceed(false)}
      onConfirm={() => proceed(true)}
    />
  )
}
 
export default confirmable(Confirmation);