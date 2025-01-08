import React from 'react';
import Project from '@/mstore/types/project';
import InstallMobileDocs from 'Shared/TrackingCodeModal/InstallIosDocs';
import { Tabs } from 'UI';
import ProjectCodeSnippet from 'Shared/TrackingCodeModal/ProjectCodeSnippet/ProjectCodeSnippet';
import InstallDocs from 'Shared/TrackingCodeModal/InstallDocs';
import usePageTitle from '@/hooks/usePageTitle';

const PROJECT = 'Using Script';
const DOCUMENTATION = 'Using NPM';
const TABS = [
  { key: DOCUMENTATION, text: DOCUMENTATION },
  { key: PROJECT, text: PROJECT }
];

interface Props {
  project: Project;
}

function ProjectTabTracking(props: Props) {
  usePageTitle('Installation - OpenReplay Preferences');
  const { project } = props;
  const [activeTab, setActiveTab] = React.useState(PROJECT);
  const ingestPoint = `https://${window.location.hostname}/ingest`;

  const renderActiveTab = () => {
    switch (activeTab) {
      case PROJECT:
        return <ProjectCodeSnippet site={project} />;
      case DOCUMENTATION:
        return <InstallDocs site={project} />;
    }
    return null;
  };

  return (
    <div>
      {project.platform === 'ios' ? (
        <InstallMobileDocs site={project} ingestPoint={ingestPoint} />
      ) : (
        <div>
          <Tabs
            tabs={TABS}
            active={activeTab}
            onClick={(tab: string) => setActiveTab(tab)}
          />
          <div className="p-5">{renderActiveTab()}</div>
        </div>
      )}
    </div>
  );
}

export default ProjectTabTracking;
