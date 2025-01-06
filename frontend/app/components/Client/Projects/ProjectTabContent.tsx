import React from 'react';
import { useStore } from '@/mstore';
import { observer } from 'mobx-react-lite';
import ProjectTabTracking from 'Components/Client/Projects/ProjectTabTracking';
import CustomFields from 'Components/Client/CustomFields';
import ProjectTags from 'Components/Client/Projects/ProjectTags';

function ProjectTabContent() {
  const { projectsStore } = useStore();
  const { pid, tab } = projectsStore.config;

  const tabContent: Record<string, React.ReactNode> = React.useMemo(() => {
    const project = projectsStore.list.find((p) => p.projectId == pid);
    return {
      installation: <ProjectTabTracking project={project!} />,
      captureRate: <div>Capture Rate Content</div>,
      metadata: <CustomFields />,
      tags: <ProjectTags />,
      groupKeys: <div>Group Keys Content</div>
    };
  }, [pid, projectsStore.list]);

  return (
    <div>
      {tabContent[tab]}
    </div>
  );
}

export default observer(ProjectTabContent);
