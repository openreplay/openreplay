import React from 'react';
import Project from '@/mstore/types/project';
import { Tabs } from 'UI';
import {
  AppleOutlined,
  AndroidOutlined,
  CodeOutlined,
  JavaScriptOutlined,
} from '@ant-design/icons';
import usePageTitle from '@/hooks/usePageTitle';
import InstallDocs from 'Components/Onboarding/components/OnboardingTabs/InstallDocs';
import ProjectCodeSnippet from 'Components/Client/Projects/ProjectCodeSnippet';
import MobileInstallDocs from 'Components/Onboarding/components/OnboardingTabs/InstallDocs/MobileInstallDocs';
import { Segmented } from 'antd';
import AndroidInstallDocs from 'Components/Onboarding/components/OnboardingTabs/InstallDocs/AndroidInstallDocs';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const [isNpm, setIsNpm] = React.useState(true);

  return (
    <div className="">
      <Segmented
        options={[
          {
            label: (
              <div className="flex items-center gap-2">
                <CodeOutlined />
                <span>{t('NPM')}</span>
              </div>
            ),
            value: true,
          },
          {
            label: (
              <div className="flex items-center gap-2">
                <JavaScriptOutlined />
                <span>{t('Script')}</span>
              </div>
            ),
            value: false,
          },
        ]}
        value={isNpm}
        onChange={setIsNpm}
        className="!align-middle text-center rounded-lg"
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
  const { t } = useTranslation();
  const [isIos, setIsIos] = React.useState(true);
  const ingestPoint = `https://${window.location.hostname}/ingest`;

  return (
    <div>
      <Segmented
        options={[
          {
            label: (
              <div className="flex items-center gap-2">
                <AppleOutlined />
                <span>{t('iOS')}</span>
              </div>
            ),
            value: true,
          },
          {
            label: (
              <div className="flex items-center gap-2">
                <AndroidOutlined />
                <span>{t('Android')}</span>
              </div>
            ),
            value: false,
          },
        ]}
        value={isIos}
        onChange={setIsIos}
        className="rounded-lg"
      />

      {isIos ? (
        <MobileInstallDocs site={project} ingestPoint={ingestPoint} />
      ) : (
        <AndroidInstallDocs site={project} ingestPoint={ingestPoint} />
      )}
    </div>
  );
}
