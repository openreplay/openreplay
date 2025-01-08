import React, { useEffect } from 'react';
import { useStore } from '@/mstore';
import { List, Button, Typography, Space, Empty } from 'antd';
import { observer } from 'mobx-react-lite';
import { PencilIcon, ScanSearch } from 'lucide-react';
import { useModal } from 'Components/ModalContext';
import TagForm from 'Components/Client/Projects/TagForm';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';

function ProjectTags() {
  const { tagWatchStore, projectsStore } = useStore();
  const list = tagWatchStore.tags;
  const { openModal } = useModal();
  const { pid } = projectsStore.config;

  useEffect(() => {
    void tagWatchStore.getTags(pid);
  }, [pid]);

  const handleInit = (tag?: any) => {
    openModal(<TagForm tag={tag} projectId={pid!} />, {
      title: tag ? 'Edit Tag' : 'Add Tag'
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <Space direction="vertical">
        <Typography.Text>
          Manage Tag Elements here. Rename tags for easy identification or delete those you no longer need.
        </Typography.Text>
        <ul className="!list-disc list-inside">
          <li><Typography.Text>To create new tags, navigate to the Tags tab while playing a session.</Typography.Text>
          </li>
          <li><Typography.Text>Use tags in OmniSearch to quickly find relevant sessions.</Typography.Text>
          </li>
        </ul>
      </Space>
      <List
        locale={{
          emptyText: <Empty description="No tags found" image={<AnimatedSVG name={ICONS.NO_METADATA} size={60} />} />
        }}
        loading={tagWatchStore.isLoading}
        dataSource={list}
        renderItem={(item) => (
          <List.Item
            className="cursor-pointer group hover:bg-active-blue !px-4"
            actions={[
              <Button className="opacity-0 group-hover:!opacity-100" icon={<PencilIcon size={14} />} />
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
