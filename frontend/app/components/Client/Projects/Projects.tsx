import React from 'react';
import { Button, Card, Col, Divider, Row, Space, Typography } from 'antd';
import ProjectList from 'Components/Client/Projects/ProjectList';
import ProjectTabs from 'Components/Client/Projects/ProjectTabs';
import { useHistory } from 'react-router-dom';
import { useStore } from '@/mstore';
import { observer } from 'mobx-react-lite';
import { PlusIcon } from 'lucide-react';
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
      title="Projects"
      classNames={{
        cover: '!rounded-lg border shadow-sm',
        body: '!p-0'
      }}
      style={{ height: 'calc(100vh - 140px)' }}
      extra={
        <Space>
          <Button onClick={createProject} icon={<PlusIcon />}>
            Create Project
          </Button>
        </Space>
      }
    >
      <Row className="h-full">
        <Col span={6} className="border-r !p-4 flex flex-col">
          <div className="flex-1 !overflow-y-auto">
            <ProjectList />
          </div>
        </Col>
        <Col span={18} className="!p-4 flex flex-col">
        <Space className="flex justify-between">
            <Typography.Title level={5} className="capitalize !m-0">{project?.name}</Typography.Title>
            <ProjectTabs />
          </Space>
          <Divider style={{ margin: '0px' }} />
          <div className="flex-1 !overflow-y-auto my-4">
            {project && <ProjectTabContent />}
          </div>
        </Col>
      </Row>
    </Card>
  );
}

export default observer(Projects);
