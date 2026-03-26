import withPageTitle from '@/components/hocs/withPageTitle';
import { useStore } from '@/mstore';
import { EditOutlined } from '@ant-design/icons';
import { Button, List, Typography } from 'antd';
import { ScanSearch } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import type { Tag } from 'App/services/TagWatchService';
import { useModal } from 'Components/ModalContext';
import { Pagination } from 'UI';

import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';

import TagForm from './TagForm';

function TagsPage() {
  const { t } = useTranslation();
  const { tagWatchStore, projectsStore } = useStore();
  const list = tagWatchStore.tags;
  const { openModal } = useModal();
  const siteId = projectsStore.siteId;

  useEffect(() => {
    void tagWatchStore.getTags(Number(siteId));
  }, [siteId]);

  const onPageChange = (page: number) => {
    void tagWatchStore.getTags(Number(siteId), page);
  };

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
        renderItem={(item: Tag) => (
          <List.Item
            className="cursor-pointer group hover:bg-active-blue px-4!"
            onClick={() => handleEdit(item)}
          >
            <List.Item.Meta
              title={item.name}
              description={
                <span>
                  {item.location ? (
                    <span className="mr-2 text-gray-medium">
                      {item.location}
                    </span>
                  ) : null}
                  {item.selector}
                </span>
              }
              avatar={<ScanSearch size={20} />}
            />
            <div className="ml-auto flex items-center">
              <div className="flex flex-col text-xs text-gray-500 text-right group-hover:hidden">
                <span>
                  {item.users ?? 0} {t('users')}
                </span>
                <span>
                  {item.volume ?? 0} {t('interactions')}
                </span>
              </div>
              <Button
                type="link"
                className="hidden group-hover:flex! text-black!"
                icon={<EditOutlined size={14} />}
              />
            </div>
          </List.Item>
        )}
      />
      <div className="flex items-center justify-between mt-4">
        <Typography.Text type="secondary">
          {t('Showing')} <span className="font-medium">{list.length === 0 ? 0 : (tagWatchStore.page - 1) * tagWatchStore.limit + 1}</span> {t('to')} <span className="font-medium">{(tagWatchStore.page - 1) * tagWatchStore.limit + list.length}</span> {t('of')} <span className="font-medium">{tagWatchStore.total}</span>
        </Typography.Text>
        <Pagination
          page={tagWatchStore.page}
          total={tagWatchStore.total}
          onPageChange={onPageChange}
          limit={tagWatchStore.limit}
          debounceRequest={500}
        />
      </div>
    </div>
  );
}

export default withPageTitle('Features')(observer(TagsPage));
