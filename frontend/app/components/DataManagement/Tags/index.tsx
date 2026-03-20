import withPageTitle from '@/components/hocs/withPageTitle';
import React, { useEffect } from 'react';
import { useStore } from '@/mstore';
import { List, Button, Typography } from 'antd';
import { observer } from 'mobx-react-lite';
import { ScanSearch } from 'lucide-react';
import { EditOutlined } from '@ant-design/icons';
import { useModal } from 'Components/ModalContext';
import TagForm from './TagForm';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import { useTranslation } from 'react-i18next';

function TagsPage() {
  const { t } = useTranslation();
  const { tagWatchStore, projectsStore } = useStore();
  const list = tagWatchStore.tags;
  const { openModal } = useModal();
  const siteId = projectsStore.siteId;

  useEffect(() => {
    void tagWatchStore.getTags(Number(siteId));
  }, [siteId]);

  const handleEdit = (tag?: any) => {
    openModal(<TagForm tag={tag} projectId={Number(siteId)} />, {
      title: tag ? t('Edit Feature') : t('Add Feature'),
    });
  };

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="mb-4">
        <Typography.Title level={4} className="mb-1!">
          {t('Features')}
        </Typography.Title>
        <Typography.Text type="secondary">
          {t(
            'Tag features during session playback and use them in OmniSearch to find relevant sessions.',
          )}
        </Typography.Text>
      </div>

      <List
        locale={{
          emptyText: (
            <div>
              <div className="w-fit border border-gray-100 rounded-lg overflow-hidden bg-white shadow-xs mx-auto">
                <div className="w-full h-48 md:h-64 lg:h-96 flex items-center justify-center border border-gray-100 bg-white rounded-md">
                  <img
                    src="/assets/img/img-tagging.jpg"
                    alt="Features"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              </div>
              <div className="text-center mt-4">
                <Typography.Text className="my-2! text-lg! font-medium!">
                  {t('Organize and Manage Your Features')}
                </Typography.Text>
                <div className="mb-2 text-lg text-gray-500 leading-normal">
                  {t(
                    'Tag features during session playback and use them in OmniSearch to find relevant sessions.',
                  )}
                </div>
              </div>
            </div>
          ),
        }}
        loading={tagWatchStore.isLoading}
        dataSource={list}
        renderItem={(item) => (
          <List.Item
            className="cursor-pointer group hover:bg-active-blue px-4!"
            actions={[
              <Button
                type="link"
                className="opacity-0 group-hover:opacity-100! text-black!"
                icon={<EditOutlined size={14} />}
              />,
            ]}
            onClick={() => handleEdit(item)}
          >
            <List.Item.Meta
              title={item.name}
              description={
                <span>
                  {item.selector}
                  {item.location ? (
                    <span className="ml-2 text-gray-400">
                      {item.location}
                    </span>
                  ) : null}
                </span>
              }
              avatar={<ScanSearch size={20} />}
            />
          </List.Item>
        )}
      />
    </div>
  );
}

export default withPageTitle('Features')(observer(TagsPage));
