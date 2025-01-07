import React from 'react';
import { Avatar, Input, Menu, Progress } from 'antd';
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
      <div className="px-4 mt-4">
        <Input.Search
          placeholder="Search"
          onSearch={onSearch}
          onClear={() => setSearch('')}
          allowClear
        />
      </div>
      <div
        style={{
          height: 'calc(100vh - 250px)'
        }}
        className="overflow-y-auto"
      >
        <Menu
          mode="inline"
          selectedKeys={[config.pid + '']}
          className="w-full ml-0 pl-0 !bg-white !border-r-0"
          items={list.filter((item: Project) => item.name.toLowerCase().includes(search.toLowerCase())).map((project) => ({
            key: project.id,
            label: project.name,
            onClick: () => onProjectClick(project),
            icon: <ProjectIconWithProgress platform={project.platform} progress={project.sampleRate} />
          })) as any}
        />
      </div>
    </div>
  );
}

export default observer(ProjectList);


const ProjectIconWithProgress: React.FC<{
  platform: string; progress: number
}> = ({ platform, progress }) => {
  return (
    <div className="relative flex items-center justify-center mr-2 leading-none">
      <Progress
        type="circle"
        percent={progress}
        size={28}
        format={() => ''}
        strokeWidth={4}
        strokeColor="#23959a"
      />
      <div className="absolute">
        <Avatar
          className="bg-tealx-light"
          size={26}
          icon={
            platform === 'web' ? (
              <AppWindowMac size={16} color="teal" />
            ) : (
              <Smartphone size={16} color="teal" />
            )
          }
        />
      </div>
    </div>
  );
};
