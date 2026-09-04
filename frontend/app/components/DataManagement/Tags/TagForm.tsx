import { useStore } from '@/mstore';
import { Button, Form, Input, Segmented, Space } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useModal } from 'Components/ModalContext';
import { confirm } from 'UI';
import Trash from 'UI/Icons/trash';

interface Props {
  tag: any;
  projectId: number;
}

function TagForm(props: Props) {
  const { t } = useTranslation();
  const { tag, projectId } = props;
  const { tagWatchStore } = useStore();
  const [name, setName] = React.useState(tag.name);
  const [scope, setScope] = React.useState<'entire' | 'location'>(
    tag.location ? 'location' : 'entire',
  );
  const [location, setLocation] = React.useState(tag.location || '');
  const [loading, setLoading] = React.useState(false);
  const { closeModal } = useModal();

  const effectiveLocation = scope === 'location' ? location : '';
  const hasChanges =
    (name !== tag.name || effectiveLocation !== (tag.location || '')) &&
    name.length > 0;

  const onDelete = async () => {
    if (
      await confirm({
        header: t('Remove Feature'),
        confirmButton: t('Remove'),
        confirmation: t('Are you sure you want to remove this feature?'),
      })
    ) {
      await tagWatchStore.deleteTag(tag.tagId, projectId);
      closeModal();
    }
  };

  const onSave = async () => {
    setLoading(true);
    tagWatchStore
      .updateTag(
        tag.tagId,
        { name, location: effectiveLocation || undefined },
        projectId,
      )
      .then(() => {
        closeModal();
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <Form layout="vertical">
      <Form.Item label={t('Name')} className="font-medium!">
        <Input
          autoFocus
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('Name')}
          maxLength={50}
          className="font-normal rounded-lg"
        />
      </Form.Item>
      <Form.Item label={t('Selector')} className="font-medium!">
        <Input value={tag.selector} disabled name={'selector'} />
      </Form.Item>
      <Form.Item label={t('Scope')} className="font-medium!">
        <Segmented
          size="small"
          value={scope}
          onChange={(val) => setScope(val as 'entire' | 'location')}
          options={[
            { label: t('Entire app'), value: 'entire' },
            { label: t('Specific page'), value: 'location' },
          ]}
        />
        {scope === 'location' && (
          <Input
            className="mt-2!"
            name="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={t('E.g. /checkout')}
          />
        )}
      </Form.Item>
      {tag.tagId && (
        <div>
          <div className="flex items-center justify-between">
            <div className="font-semibold">{t('Metrics')}</div>
            <div>{t('Last 24h')}</div>
          </div>
          <div className="flex gap-4 items-center mt-2 mb-4 w-full">
            <div className="flex-1 flex flex-col items-center justify-center p-4 rounded-xl bg-gray-light">
              <div className="text-gray-medium font-semibold text-xl">
                {tag.users ?? 0}
              </div>
              <div className="text-gray-dark">{t('Unique users')}</div>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center p-4 rounded-xl bg-teal-light">
              <div className="text-teal font-semibold text-xl">
                {tag.volume ?? 0}
              </div>
              <div className="text-gray-dark">{t('Total interactions')}</div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <Space>
          <Button
            onClick={onSave}
            disabled={!hasChanges || loading}
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
