import React from 'react';
import { Modal, Form, Input } from 'UI';
import { Button } from 'antd';
import { CloseOutlined } from '@ant-design/icons';

interface Props {
  onSave: (newName: string) => void;
  onClose: () => void;
  itemName: string;
}

function EditItemModal(props: Props) {
  const [name, setName] = React.useState(props.itemName);
  const saveResult = () => {
    props.onSave(name);
  }
  return (
    <Modal open onClose={props.onClose}>
      <Modal.Header className="flex items-center justify-between">
        <div>{'Edit Spot'}</div>
        <Button
          type='text'
          name="close"
          onClick={props.onClose}
          icon={<CloseOutlined />}
        />
      </Modal.Header>
      <Modal.Content>
        <Form onSubmit={saveResult}>
          <label>Title</label>
          <Input
            className=""
            name="title"
            value={ name }
            onChange={({ target: { value } }) => setName(value)}
            placeholder="Title"
            maxLength={100}
            autoFocus
          />
        </Form>
      </Modal.Content>
      <Modal.Footer>
        <div className="-mx-2 px-2">
          <Button
            type="primary"
            onClick={ saveResult }
            className="float-left mr-2"
          >
            Save
          </Button>
          <Button type='default' onClick={ props.onClose }>{ 'Cancel' }</Button>
        </div>
      </Modal.Footer>
    </Modal>
  )
}

export default EditItemModal;