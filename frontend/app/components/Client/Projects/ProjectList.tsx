import React from 'react';
import {
  Avatar,
  Button,
  Input,
  Menu,
  MenuProps,
  Progress,
  Typography,
  Tooltip,
} from 'antd';
import { useStore } from '@/mstore';
import Project from '@/mstore/types/project';
import { observer } from 'mobx-react-lite';
import { Globe, Smartphone } from 'lucide-react';
import { SearchOutlined, EditOutlined } from '@ant-design/icons';
import ProjectForm from 'Components/Client/Projects/ProjectForm';
import { useModal } from 'Components/ModalContext';
import { useTranslation } from 'react-i18next';

type MenuItem = Required<MenuProps>['items'][number];

const ProjectList: React.FC = () => {
  const { t } = useTranslation();
  const { projectsStore } = useStore();
  const [search, setSearch] = React.useState('');
  const { openModal, closeModal } = useModal();

  const filteredProjects = projectsStore.list.filter((project: Project) =>
    project.name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleSearch = (value: string) => setSearch(value);

  const onClick: MenuProps['onClick'] = (e) => {
    const pid = parseInt(e.key as string);
    projectsStore.setConfigProject(pid);
  };

  const projectEditHandler = (e: React.MouseEvent, project: Project) => {
    // e.stopPropagation();

    projectsStore.initProject(project);

    openModal(<ProjectForm onClose={closeModal} project={project} />, {
      title: t('Edit Project'),
    });
  };

  const menuItems: MenuItem[] = filteredProjects.map((project) => ({
    key: `${project.id}`,
    label: (
      <Typography.Text style={{ color: 'inherit' }} ellipsis>
        {project.name}
      </Typography.Text>
    ),
    extra: (
      <Button
        onClick={(e) => projectEditHandler(e, project)}
        className="flex opacity-0 group-hover:!opacity-100"
        size="small"
        type="link"
        icon={<EditOutlined size={14} />}
      />
    ),
    className: 'group',
    icon: (
      <ProjectIconWithProgress
        platform={project.platform}
        progress={project.sampleRate}
      />
    ),
  }));

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex flex-row gap-2 items-center p-3">
        <Input
          placeholder={t('Search projects')}
          // onSearch={handleSearch}
          prefix={<SearchOutlined />}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          className="rounded-lg"
        />
      </div>
      <div
        className="overflow-y-auto pref-projects-menu"
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
  <Tooltip title={`${progress}% Capture Rate`}>
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
              <Globe size={16} color="teal" />
            ) : (
              <Smartphone size={16} color="teal" />
            )
          }
        />
      </div>
    </div>
  </Tooltip>
);
