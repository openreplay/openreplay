import React from 'react';
import { App, Button, Card, Layout, Space, Typography } from 'antd';
import ProjectList from 'Components/Client/Projects/ProjectList';
import ProjectTabs from 'Components/Client/Projects/ProjectTabs';
import { useHistory } from 'react-router-dom';
import { useStore } from '@/mstore';
import { observer } from 'mobx-react-lite';
import { KeyIcon, PlusIcon } from 'lucide-react';
import ProjectTabContent from 'Components/Client/Projects/ProjectTabContent';
import { useModal } from 'Components/ModalContext';
import ProjectForm from 'Components/Client/Projects/ProjectForm';
import Project from '@/mstore/types/project';

function Projects() {
  const { projectsStore } = useStore();
  const history = useHistory();
  const { project, pid, tab } = projectsStore.config;
  const { openModal, closeModal } = useModal();

  React.useEffect(() => {
    const params = new URLSearchParams(history.location.search);
    const pid = params.get('pid');
    const tab = params.get('tab');
    projectsStore.setConfigProject(pid ? parseInt(pid) : undefined);
    projectsStore.setConfigTab(tab);
  }, []);

  React.useEffect(() => {
    const params = new URLSearchParams(history.location.search);
    if (projectsStore.config.pid) {
      params.set('pid', projectsStore.config.pid + '');
    }

    if (projectsStore.config.tab) {
      params.set('tab', projectsStore.config.tab);
    }
    history.push({ search: params.toString() });
  }, [pid, tab]);

  const createProject = () => {
    openModal(<ProjectForm onClose={closeModal} project={new Project()} />, {
      title: 'New Project'
    });
  };

  return (
    <Card
      style={{ height: 'calc(100vh - 130px)' }}
      classNames={{
        header: '!border-b',
        body: '!p-0 !border-t'
      }}
      title="Projects"
      extra={[
        <Button key="1" onClick={createProject} icon={<PlusIcon />}>
          Create Project
        </Button>
      ]}
    >
      <Layout>
        <Layout.Sider width={300} trigger={null} className="!bg-white border-r">
          <ProjectList />
        </Layout.Sider>

        <Layout>
          <Layout.Header className="flex justify-between items-center p-4 !bg-white border-b"
                         style={{ height: 46 }}>
            <div className="flex items-center gap-4">
              <Typography.Title level={5}
                                className="capitalize !m-0 whitespace-nowrap truncate">{project?.name}</Typography.Title>
              <ProjectKeyButton />
            </div>
            <ProjectTabs />
          </Layout.Header>
          <Layout.Content
            style={{
              padding: 24,
              height: 'calc(100vh - 260px)'
            }}
            className="bg-white overflow-y-auto"
          >
            {project && <ProjectTabContent />}
          </Layout.Content>
        </Layout>
      </Layout>
    </Card>
  );
}

export default observer(Projects);

function ProjectKeyButton() {
  const { projectsStore } = useStore();
  const { project } = projectsStore.config;
  const { message } = App.useApp();

  const copyKey = () => {
    if (!project || !project.projectKey) {
      void message.error('Project key not found');
      return;
    }
    void navigator.clipboard.writeText(project?.projectKey || '');
    void message.success('Project key copied to clipboard');
  };

  return (
    <Button onClick={copyKey} icon={<KeyIcon size={14} />} size="small" />
  );
}
