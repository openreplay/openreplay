import React from 'react';
import { Avatar, Input, Menu, MenuProps, Progress } from 'antd';
import { useStore } from '@/mstore';
import Project from '@/mstore/types/project';
import { observer } from 'mobx-react-lite';
import { AppWindowMac, Smartphone } from 'lucide-react';

type MenuItem = Required<MenuProps>['items'][number];

const ProjectList: React.FC = () => {
  const { projectsStore } = useStore();
  const [search, setSearch] = React.useState('');

  const filteredProjects = projectsStore.list.filter((project: Project) =>
    project.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSearch = (value: string) => setSearch(value);

  const onClick: MenuProps['onClick'] = (e) => {
    const pid = parseInt(e.key as string);
    projectsStore.setConfigProject(pid);
  };

  const menuItems: MenuItem[] = filteredProjects.map((project) => ({
    key: project.id + '',
    label: project.name,
    icon: (
      <ProjectIconWithProgress
        platform={project.platform}
        progress={project.sampleRate}
      />
    )
  }));

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="px-4 mt-4">
        <Input.Search
          placeholder="Search projects"
          onSearch={handleSearch}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
        />
      </div>
      <div
        className="overflow-y-auto"
        style={{ height: 'calc(100vh - 250px)' }}
      >
        <Menu
          mode="inline"
          onClick={onClick}
          selectedKeys={[String(projectsStore.config.pid)]}
          className="w-full !bg-white !border-0"
          inlineIndent={11}
          items={menuItems}
        />
      </div>
    </div>
  );
};

export default observer(ProjectList);

const ProjectIconWithProgress: React.FC<{
  platform: string;
  progress: number;
}> = ({ platform, progress }) => (
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
