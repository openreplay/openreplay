import React from 'react';
import Project from '@/mstore/types/project';
import { Tabs } from 'UI';

import usePageTitle from '@/hooks/usePageTitle';
import InstallDocs from 'Components/Onboarding/components/OnboardingTabs/InstallDocs';
import ProjectCodeSnippet from 'Components/Client/Projects/ProjectCodeSnippet';
import MobileInstallDocs from 'Components/Onboarding/components/OnboardingTabs/InstallDocs/MobileInstallDocs';
import { Segmented } from 'antd';
import AndroidInstallDocs from 'Components/Onboarding/components/OnboardingTabs/InstallDocs/AndroidInstallDocs';

const JAVASCRIPT = 'Using Script';
const NPM = 'Using NPM';
const TABS = [
  { key: NPM, text: NPM },
  { key: JAVASCRIPT, text: JAVASCRIPT }
];

interface Props {
  project: Project;
}

function ProjectTabTracking(props: Props) {
  usePageTitle('Installation - OpenReplay Preferences');
  const { project } = props;

  return (
    <div>
      {project.platform !== 'web' ? (
        <MobileSnippet project={project} />
      ) : (
        <WebSnippet project={project} />
      )}
    </div>
  );
}

export default ProjectTabTracking;

function WebSnippet({ project }: { project: Project }) {
  const [isNpm, setIsNpm] = React.useState(true);

  return (
    <div className="flex flex-col gap-4">
      <Segmented
        options={[
          { label: 'Using NPM', value: true },
          { label: 'Using Script', value: false }
        ]}
        value={isNpm}
        onChange={setIsNpm}
        block={true}
        style={{ maxWidth: '200px' }}
        className="!align-middle"
      />

      {isNpm ? (
        <InstallDocs site={project} />
      ) : (
        <ProjectCodeSnippet project={project} />
      )}
    </div>
  );
}

function MobileSnippet({ project }: { project: Project }) {
  const [isIos, setIsIos] = React.useState(true);
  const ingestPoint = `https://${window.location.hostname}/ingest`;

  return (
    <div className="flex flex-col gap-4">
      <Segmented
        options={[
          { label: 'iOS', value: true },
          { label: 'Android', value: false }
        ]}
        value={isIos}
        onChange={setIsIos}
        block={true}
        style={{ maxWidth: '150px' }}
        className="!align-middle"
      />


      {isIos ? (
        <MobileInstallDocs site={project} ingestPoint={ingestPoint} />
      ) : (
        <AndroidInstallDocs site={project} ingestPoint={ingestPoint} />
      )}
    </div>
  );
}
