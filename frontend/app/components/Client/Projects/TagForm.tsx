import React from 'react';
import { Button, Form, Input, Space } from 'antd';
import { Trash } from 'UI/Icons';
import { useStore } from '@/mstore';
import { useModal } from 'Components/ModalContext';
import { useTranslation } from 'react-i18next';
import { confirm } from 'UI';
interface Props {
  tag: any;
  projectId: number;
}

function TagForm(props: Props) {
  const { t } = useTranslation();
  const { tag, projectId } = props;
  const { tagWatchStore } = useStore();
  const [name, setName] = React.useState(tag.name);
  const [loading, setLoading] = React.useState(false);
  const { closeModal } = useModal();

  const write = ({ target: { value, name } }: any) => {
    setName(value);
  };

  const onDelete = async () => {
    if (
      await confirm({
        header: t('Remove Tag'),
        confirmButton: t('Remove'),
        confirmation: t('Are you sure you want to remove this tag?'),
      })
    ) {
      await tagWatchStore.deleteTag(tag.tagId, projectId);
      closeModal();
    }
  };

  const onSave = async () => {
    setLoading(true);
    tagWatchStore
      .updateTagName(tag.tagId, name, projectId)
      .then(() => {
        closeModal();
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <Form layout="vertical">
      <Form.Item label={t('Name:')} className="font-medium">
        <label htmlFor="name">{t('Name')}</label>
        <Input
          autoFocus
          name="name"
          value={name}
          onChange={write}
          placeholder={t('Name')}
          maxLength={50}
          className="font-normal rounded-lg"
        />
      </Form.Item>
      <Form.Item label={t('Selector:')} className="font-medium">
        <label htmlFor={'selector'}>Selector:</label>
        <Input value={tag.selector} disabled name={'selector'} />
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
            {t('Update')}
          </Button>
          <Button type="text" onClick={closeModal}>
            {t('Cancel')}
          </Button>
        </Space>

        <Button type="text" icon={<Trash />} onClick={onDelete} />
      </div>
    </Form>
  );
}

export default TagForm;
