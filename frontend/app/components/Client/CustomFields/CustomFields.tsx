import React, { useEffect, useState } from 'react';
import { NoContent } from 'UI';
import CustomFieldForm from './CustomFieldForm';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import { useModal } from 'App/components/Modal';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { List, Space, Typography, Button, Tooltip } from 'antd';
import { PencilIcon, PlusIcon, Tags } from 'lucide-react';
import usePageTitle from '@/hooks/usePageTitle';

const CustomFields = () => {
  usePageTitle('Metadata - OpenReplay Preferences');
  const { customFieldStore: store, projectsStore } = useStore();
  const currentSite = projectsStore.config.project;
  const { showModal, hideModal } = useModal();
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
    showModal(<CustomFieldForm siteId={currentSite?.projectId + ''} />, {
      title: field ? 'Edit Metadata' : 'Add Metadata', right: true
    });
  };

  const remaining = 10 - fields.length;

  return (
    <div className="flex flex-col gap-6">
      <Typography.Text>
        Attach key-value pairs to session replays for enhanced filtering, searching, and identifying relevant user
        sessions. Learn More.
        <a href="https://docs.openreplay.com/installation/metadata" className="link ml-1" target="_blank">
          Learn more
        </a>
      </Typography.Text>

      <Space>
        <Tooltip
          title={remaining > 0 ? '' : 'You\'ve reached the limit of 10 metadata.'}
        >
          <Button icon={<PlusIcon size={18} />} type="primary"
                  disabled={remaining === 0}
                  onClick={() => handleInit()}>
            Add Metadata
          </Button>
        </Tooltip>
        {/*{remaining === 0 && <Icon name="info-circle" size={16} color="black" />}*/}
        <Typography.Text type="secondary">
          {remaining === 0 ? 'You have reached the limit of 10 metadata.' : `${remaining}/10 Remaining for this project`}
        </Typography.Text>
      </Space>


      <NoContent
        title={
          <div className="flex flex-col items-center justify-center">
            <AnimatedSVG name={ICONS.NO_METADATA} size={60} />
            <div className="text-center my-4">None added yet</div>
          </div>
        }
        size="small"
        show={fields.length === 0}
      >
        <List
          loading={loading}
          dataSource={fields}
          renderItem={(field: any) => (
            <List.Item
              // disabled={deletingItem !== null && deletingItem === field.index}
              onClick={() => handleInit(field)}
              className="cursor-pointer group hover:bg-active-blue !px-4"
              actions={[
                <Button className="opacity-0 group-hover:!opacity-100" icon={<PencilIcon size={14} />} />
              ]}
            >
              <List.Item.Meta
                title={field.key}
                avatar={<Tags size={20} />}
              />
            </List.Item>
          )} />
      </NoContent>
    </div>
  );
};

export default observer(CustomFields);
