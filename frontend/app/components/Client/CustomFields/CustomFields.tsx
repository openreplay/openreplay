import React, { useEffect, useState } from 'react';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import { useModal } from 'App/components/Modal';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { List, Space, Typography, Button, Tooltip, Empty } from 'antd';
import { PlusIcon, Tags } from 'lucide-react';
import { EditOutlined } from '@ant-design/icons';
import usePageTitle from '@/hooks/usePageTitle';
import CustomFieldForm from './CustomFieldForm';
import { useTranslation } from 'react-i18next';

function CustomFields() {
  usePageTitle('Metadata - OpenReplay Preferences');
  const { t } = useTranslation();
  const { customFieldStore: store, projectsStore } = useStore();
  const currentSite = projectsStore.config.project;
  const { showModal } = useModal();
  const fields = store.list;
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    store.fetchList(currentSite?.id).finally(() => {
      setLoading(false);
    });
  }, [currentSite]);

  const handleInit = (field?: any) => {
    store.init(field);
    showModal(<CustomFieldForm siteId={`${currentSite?.projectId}`} />, {
      title: field ? t('Edit Metadata') : t('Add Metadata'),
      right: true,
    });
  };

  const remaining = 10 - fields.length;

  return (
    <div className="flex flex-col gap-6">
      <Typography.Text>
        {t('Attach key-value pairs to session replays for enhanced filtering, searching, and identifying relevant user sessions.')}
        <a href="https://docs.openreplay.com/en/session-replay/metadata" className="link ml-1" target="_blank">
          {t('Learn more')}
        </a>
      </Typography.Text>

      <Space>
        <Tooltip
          title={
            remaining > 0 ? '' : t("You've reached the limit of 10 metadata.")
          }
        >
          <Button
            icon={<PlusIcon size={18} />}
            type="primary"
            size="small"
            disabled={remaining === 0}
            onClick={() => handleInit()}
          >
            {t('Add Metadata')}
          </Button>
        </Tooltip>
        {/* {remaining === 0 && <Icon name="info-circle" size={16} color="black" />} */}
        <Typography.Text type="secondary">
          {remaining === 0
            ? t('You have reached the limit of 10 metadata.')
            : `${remaining}${t('/10 Remaining for this project')}`}
        </Typography.Text>
      </Space>

      <List
        locale={{
          emptyText: (
            <Empty
              description={t('None added yet')}
              image={<AnimatedSVG name={ICONS.NO_METADATA} size={60} />}
            />
          ),
        }}
        loading={loading}
        dataSource={fields}
        renderItem={(field: any) => (
          <List.Item
            onClick={() => handleInit(field)}
            className="cursor-pointer group hover:bg-active-blue !px-4"
            actions={[
              <Button
                type="link"
                className="opacity-0 group-hover:!opacity-100"
                icon={<EditOutlined size={14} />}
              />,
            ]}
          >
            <List.Item.Meta title={field.key} avatar={<Tags size={20} />} />
          </List.Item>
        )}
      />
    </div>
  );
}

export default observer(CustomFields);
