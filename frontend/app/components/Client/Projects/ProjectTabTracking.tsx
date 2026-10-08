import usePageTitle from '@/hooks/usePageTitle';
import Project from '@/mstore/types/project';
import React from 'react';

import InstallGuide from 'Components/Onboarding/InstallGuide';
import type { Platform } from 'Components/Onboarding/install';

function ProjectTabTracking({ project }: { project: Project }) {
  usePageTitle('Installation - OpenReplay Preferences');
  const mobile = project.platform !== 'web';
  const [platform, setPlatform] = React.useState<Platform>(
    mobile ? 'ios' : 'web',
  );
  React.useEffect(() => setPlatform(mobile ? 'ios' : 'web'), [project.id]);
  return (
    <InstallGuide
      project={project}
      platforms={mobile ? ['ios', 'android'] : ['web']}
      platform={platform}
      onPlatform={setPlatform}
      full
    />
  );
}

export default ProjectTabTracking;
