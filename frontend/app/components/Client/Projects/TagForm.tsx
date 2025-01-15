import React from 'react';
import { Button, Form, Input, Space, Modal } from 'antd';
import { Trash } from 'UI/Icons';
import { useStore } from '@/mstore';
import { useModal } from 'Components/ModalContext';

interface Props {
  tag: any;
  projectId: number;
}

function TagForm(props: Props) {
  const { tag, projectId } = props;
  const { tagWatchStore } = useStore();
  const [name, setName] = React.useState(tag.name);
  const [loading, setLoading] = React.useState(false);
  const { closeModal } = useModal();

  const write = ({ target: { value, name } }: any) => {
    setName(value);
  };

  const onDelete = async () => {
    Modal.confirm({
      title: 'Tag',
      content: `Are you sure you want to remove?`,
      onOk: async () => {
        await tagWatchStore.deleteTag(tag.tagId, projectId);
        closeModal();
      }
    });
  };

  const onSave = async () => {
    setLoading(true);
    tagWatchStore.updateTagName(tag.tagId, name, projectId)
      .then(() => {
        closeModal();
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <Form layout="vertical">
      <Form.Item label="Name:" className='font-medium'>
        <Input
          autoFocus
          name="name"
          value={name}
          onChange={write}
          placeholder="Name"
          maxLength={50}
          className='font-normal rounded-lg'
        />
      </Form.Item>

      <div className="flex justify-between">
        <Space>
          <Button
            onClick={onSave}
            disabled={name.length === 0 || name === tag.name || loading}
            loading={loading}
            type="primary"
            className="float-left mr-1"
          >
            Update
          </Button>
          <Button type='text' onClick={closeModal}>
            Cancel
          </Button>
        </Space>

        <Button type="text" icon={<Trash />} onClick={onDelete}></Button>
      </div>
    </Form>
  );
}

export default TagForm;
