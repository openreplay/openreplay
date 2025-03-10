import React, { useEffect } from 'react';
import { useStore } from '@/mstore';
import { List, Button, Typography, Space, Empty } from 'antd';
import { observer } from 'mobx-react-lite';
import { ScanSearch } from 'lucide-react';
import { EditOutlined } from '@ant-design/icons';
import { useModal } from 'Components/ModalContext';
import TagForm from 'Components/Client/Projects/TagForm';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import { useTranslation } from 'react-i18next';

function ProjectTags() {
  const { t } = useTranslation();
  const { tagWatchStore, projectsStore } = useStore();
  const list = tagWatchStore.tags;
  const { openModal } = useModal();
  const { pid } = projectsStore.config;

  useEffect(() => {
    void tagWatchStore.getTags(pid);
  }, [pid]);

  const handleInit = (tag?: any) => {
    openModal(<TagForm tag={tag} projectId={pid!} />, {
      title: tag ? t('Edit Tag') : t('Add Tag'),
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <List
        locale={{
          emptyText: (                  
                <div>
                <div className="w-fit border border-gray-100 rounded-lg overflow-hidden  bg-white shadow-sm mx-auto">                      
                        <div className="w-full h-48 md:h-64 lg:h-96 flex items-center justify-center border border-gray-100  bg-white  rounded-md">
                          <img src="/assets/img/img-tagging.jpg" alt="Tag Elements" className="max-w-full max-h-full object-contain" />
                        </div>
                    </div>
                    <div className="text-center mt-4">
                        <Typography.Text className="my-2 text-lg font-medium">
                          {t('Organize and Manage Your Element Tags')}
                        </Typography.Text>
                        <div className="mb-2 text-lg text-gray-500 leading-normal">
                          {t('Tag elements during session playback and use them in OmniSearch to find relevant sessions.')}
                        </div>
                      </div>
                  </div>
          ),
        }}
        loading={tagWatchStore.isLoading}
        dataSource={list}
        renderItem={(item) => (
          <List.Item
            className="cursor-pointer group hover:bg-active-blue !px-4"
            actions={[
              <Button
                type="link"
                className="opacity-0 group-hover:!opacity-100"
                icon={<EditOutlined size={14} />}
              />,
            ]}
            onClick={() => handleInit(item)}
          >
            <List.Item.Meta
              title={item.name}
              avatar={<ScanSearch size={20} />}
            />
          </List.Item>
        )}
        // pagination={{
        //   pageSize: 5,
        //   showSizeChanger: false,
        //   size: 'small'
        // }}
      />
    </div>
  );
}

export default observer(ProjectTags);
