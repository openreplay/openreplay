import React from 'react';
import { Avatar, Input, Menu, List, Typography } from 'antd';
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
    <div className="h-full flex flex-col gap-4">
      <div className="p-4">
        <Input.Search
          placeholder="Search"
          onSearch={onSearch}
          onClear={() => setSearch('')}
          allowClear
          // className="m-4"
        />
      </div>
      <Menu
        mode="inline"
        selectedKeys={[config.pid + '']}
        className="h-full w-full ml-0 pl-0 !bg-white !border-r-0"
        items={list.filter((item: Project) => item.name.toLowerCase().includes(search.toLowerCase())).map((project) => ({
          key: project.id,
          label: project.name,
          onClick: () => onProjectClick(project),
          icon: <Avatar className="bg-tealx-light"
                        icon={project.platform === 'web' ? <AppWindowMac size={18} color="teal" /> :
                          <Smartphone size={18} color="teal" />} />
        })) as any}
      />
    </div>
  );
}

export default observer(ProjectList);
