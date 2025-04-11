import React from 'react';
import { useStore } from '@/mstore';
import { observer } from 'mobx-react-lite';
import ProjectTabTracking from 'Components/Client/Projects/ProjectTabTracking';
import CustomFields from 'Components/Client/CustomFields';
import ProjectTags from 'Components/Client/Projects/ProjectTags';
import ProjectCaptureRate from 'Components/Client/Projects/ProjectCaptureRate';
import { Empty } from 'antd';

const ProjectTabContent: React.FC = () => {
  const { projectsStore } = useStore();
  const { pid, tab } = projectsStore.config;

  const project = React.useMemo(
    () => projectsStore.list.find((p) => p.projectId === pid),
    [pid, projectsStore.list],
  );

  if (!project) {
    return <Empty description="Project not found" />;
  }

  const tabContent: Record<string, React.ReactNode> = React.useMemo(
    () => ({
      installation: <ProjectTabTracking project={project} />,
      captureRate: <ProjectCaptureRate project={project} />,
      metadata: <CustomFields />,
      tags: <ProjectTags />,
    }),
    [project],
  );

  return <div>{tabContent[tab] || <Empty description="Tab not found" />}</div>;
};

export default observer(ProjectTabContent);
