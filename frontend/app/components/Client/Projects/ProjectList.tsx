import React from 'react';
import { Avatar, Input, List, Typography } from 'antd';
import { useStore } from '@/mstore';
import Project from '@/mstore/types/project';
import { observer } from 'mobx-react-lite';
import { AppWindowMac, Smartphone } from 'lucide-react';

function ProjectList() {
  const { projectsStore } = useStore();
  const list = projectsStore.list;
  const [search, setSearch] = React.useState('');
  const config = projectsStore.config;

  const onSearch = (value: string) => {
    setSearch(value);
  };

  const onProjectClick = (project: Project) => {
    projectsStore.setConfigProject(project.projectId);
  };

  return (
    <div className="flex flex-col gap-4">
      <Input.Search
        placeholder="Search"
        onSearch={onSearch}
        onClear={() => setSearch('')}
        allowClear
      />
      <List
        dataSource={list.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()))}
        renderItem={(item: Project) => (
          <List.Item
            key={item.id}
            onClick={() => onProjectClick(item)}
            className={`!py-2 mb-2 rounded-lg cursor-pointer !border-b-0 ${config.project?.projectId === item.projectId ? 'bg-teal-light' : 'bg-white'}`}
          >
            <List.Item.Meta
              className="flex !items-center px-2 overflow-hidden"
              avatar={
                <Avatar
                  className="bg-tealx-light"
                  icon={item.platform === 'web' ? <AppWindowMac size={18} color="teal" /> :
                    <Smartphone size={18} color="teal" />}
                />
              }
              title={<Typography.Text className="capitalize truncate text-ellipsis">{item.name}</Typography.Text>}
            />
          </List.Item>
        )}
      />
    </div>
  );
}

export default observer(ProjectList);
