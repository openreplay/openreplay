import React from 'react';
import OnboardingTabs from '../OnboardingTabs';
import MobileOnboardingTabs from '../OnboardingTabs/OnboardingMobileTabs'
import ProjectFormButton from '../ProjectFormButton';
import {Button, Icon } from 'UI';
import withOnboarding from '../withOnboarding';
import { WithOnboardingProps } from '../withOnboarding';
import { OB_TABS } from 'App/routes';
import withPageTitle from 'App/components/hocs/withPageTitle';
import { Segmented } from "antd";

interface Props extends WithOnboardingProps {}

function InstallOpenReplayTab(props: Props) {
  const platforms = [
    { label: <div className={"font-semibold flex gap-2 items-center"}><Icon name="browser/browser" size={16} /> Web</div>, value: 'web' } as const,
    { label: <div className={"font-semibold flex gap-2 items-center"}><Icon name="mobile" size={16} /> Mobile</div>, value: 'mobile' } as const,
  ]
  const [platform, setPlatform] = React.useState(platforms[0]);
  const { site } = props;

  React.useEffect(() => {
    if (site.platform) setPlatform(platforms.find(({ value }) => value === site.platform) || platforms[0])
  }, [site])
  return (
    <>
      <h1 className="flex items-center px-4 py-3 border-b justify-between">
        <div className="flex items-center text-2xl">
          <span>👋</span>
          <div className="ml-3 flex items-end">
            <span>Hey there! Setup</span>
            <ProjectFormButton />
          </div>
        </div>
        <a href="https://docs.openreplay.com/en/sdk/" target="_blank">
          <Button variant="text-primary" icon="question-circle" className="ml-2">
            See Documentation
          </Button>
        </a>
      </h1>
      <div className="p-4 flex gap-2 items-center">
        <span className="font-medium">Your platform</span>
        <Segmented
          options={platforms}
          value={platform.value}
          onChange={(value) => setPlatform(platforms.find(({ value: v }) => v === value) || platforms[0])}
        />
      </div>
      <div className="p-4">
        {
          platform.value === 'web' ? <Snippet site={site} /> : <MobileOnboardingTabs site={site} />
        }
      </div>
      <div className="border-t px-4 py-3 flex justify-end">
        <Button
          variant="primary"
          className=""
          onClick={() => (props.navTo ? props.navTo(OB_TABS.IDENTIFY_USERS) : null)}
        >
          Identify Users
          <Icon name="arrow-right-short" color="white" size={20} />
        </Button>
      </div>
    </>
  );
}

function Snippet({ site }: { site: Record<string, any>}) {
  return (
    <>
    <div className="mb-6 text-lg font-medium">
      Setup OpenReplay through NPM package <span className="text-sm">(recommended)</span> or
      script.
    </div>
    <OnboardingTabs site={site} />
    </>
  )
}

export default withOnboarding(withPageTitle("Project Setup - OpenReplay")(InstallOpenReplayTab));
