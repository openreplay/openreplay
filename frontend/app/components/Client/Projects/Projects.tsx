import React from 'react';
import { App, Button, Card, Layout, Dropdown, Tooltip, Typography } from 'antd';
import ProjectList from 'Components/Client/Projects/ProjectList';
import ProjectTabs from 'Components/Client/Projects/ProjectTabs';
import { useHistory } from 'react-router-dom';
import { useStore } from '@/mstore';
import { observer } from 'mobx-react-lite';
import { PlusOutlined, KeyOutlined, DownOutlined } from '@ant-design/icons';
import ProjectTabContent from 'Components/Client/Projects/ProjectTabContent';
import { useModal } from 'Components/ModalContext';
import ProjectForm from 'Components/Client/Projects/ProjectForm';
import Project from '@/mstore/types/project';
import { useTranslation } from 'react-i18next';
import { mobileScreen } from 'App/utils/isMobile';

function Projects() {
  const { t } = useTranslation();
  const { projectsStore, customFieldStore } = useStore();
  const history = useHistory();
  const { project, pid, tab } = projectsStore.config;
  const { openModal, closeModal } = useModal();

  React.useEffect(() => {
    const params = new URLSearchParams(history.location.search);
    const pid = params.get('pid');
    const tab = params.get('tab');
    projectsStore.setConfigProject(pid ? parseInt(pid) : undefined);
    projectsStore.setConfigTab(tab);

    return () => {
      void customFieldStore.fetchListActive(`${projectsStore.activeSiteId}`);
    };
  }, []);

  React.useEffect(() => {
    const params = new URLSearchParams(history.location.search);
    if (projectsStore.config.pid) {
      params.set('pid', `${projectsStore.config.pid}`);
    }

    if (projectsStore.config.tab) {
      params.set('tab', projectsStore.config.tab);
    }
    history.push({ search: params.toString() });
  }, [pid, tab]);

  const createProject = () => {
    openModal(<ProjectForm onClose={closeModal} project={new Project()} />, {
      title: t('Add Project'),
    });
  };

  const projects = projectsStore.list;

  const onSelect = (key: number) => {
    projectsStore.setConfigProject(key);
  };

  const dropItems = projects.map((project) => ({
    key: project.id?.toString() ?? '0',
    label: project.name,
    onClick: () => onSelect(parseInt(project.id as unknown as string, 10)),
  }));

  return (
    <Card
      style={{ height: 'calc(100vh - 130px)' }}
      className="rounded-lg shadow-sm"
      classNames={{
        header: '!border-b !px-4',
        body: '!p-0 !border-t',
      }}
      title={
        <Typography.Title level={4} className="!m-0">
          {t('Projects')}
        </Typography.Title>
      }
      extra={
        <Button
          onClick={createProject}
          type="default"
          size="middle"
          icon={<PlusOutlined size={16} />}
        >
          {t('Add Project')}
        </Button>
      }
    >
      <Layout>
        <Layout.Sider
          width={260}
          trigger={null}
          className="hidden md:block !bg-white border-r"
        >
          <ProjectList />
        </Layout.Sider>

        <Layout>
          <Layout.Header className="flex flex-col md:flex-row md:gap-0 justify-between md:items-center p-4 !bg-white border-b h-[92px] md:h-[46px]">
            <div className="flex items-center gap-4">
              {mobileScreen ? (
                <Dropdown
                  className="w-fit"
                  menu={{
                    items: dropItems,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Typography.Title
                      level={5}
                      className="capitalize !m-0 whitespace-nowrap truncate !font-medium"
                    >
                      {project?.name}
                    </Typography.Title>
                    <DownOutlined />
                  </div>
                </Dropdown>
              ) : (
                <Typography.Title
                  level={5}
                  className="capitalize !m-0 whitespace-nowrap truncate !font-medium"
                >
                  {project?.name}
                </Typography.Title>
              )}
              <ProjectKeyButton project={project} />
            </div>
            <ProjectTabs />
          </Layout.Header>
          <Layout.Content
            style={{
              padding: '1.5rem 1rem',
              height: 'calc(100vh - 260px)',
            }}
            className="bg-white overflow-y-auto "
          >
            {project && <ProjectTabContent />}
          </Layout.Content>
        </Layout>
      </Layout>
    </Card>
  );
}

export default observer(Projects);

function ProjectKeyButton({ project }: { project: Project | null }) {
  const { message } = App.useApp();
  const { t } = useTranslation();

  const copyKey = () => {
    if (!project || !project.projectKey) {
      void message.error(t('Project key not found'));
      return;
    }
    void navigator.clipboard.writeText(project?.projectKey || '');
    void message.success(t('Project key copied to clipboard'));
  };

  return (
    <Tooltip title={t('Copy Project Key')}>
      <Button onClick={copyKey} icon={<KeyOutlined size={14} />} size="small" />
    </Tooltip>
  );
}
