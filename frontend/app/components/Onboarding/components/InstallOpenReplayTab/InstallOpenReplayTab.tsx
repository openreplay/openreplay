import React from 'react';
import { Icon } from 'UI';
import { OB_TABS } from 'App/routes';
import withPageTitle from 'App/components/hocs/withPageTitle';
import { Segmented, Button } from 'antd';
import OnboardingTabs from '../OnboardingTabs';
import MobileOnboardingTabs from '../OnboardingTabs/OnboardingMobileTabs';
import ProjectFormButton from '../ProjectFormButton';
import withOnboarding, { WithOnboardingProps } from '../withOnboarding';
import { useTranslation } from 'react-i18next';
import { CircleHelp } from 'lucide-react'

interface Props extends WithOnboardingProps {
  platforms: Array<{
    label: string;
    value: string;
  }>;
  platform: {
    label: string;
    value: string;
  };
  setPlatform: (val: { label: string; value: string }) => void;
  platformMap: Record<string, any>;
}

function InstallOpenReplayTab(props: Props) {
  const { t } = useTranslation();
  const { site, platforms, platform, setPlatform, platformMap } = props;

  React.useEffect(() => {
    if (site.platform)
      setPlatform(
        platforms.find(({ value }) => value === platformMap[site.platform]) ||
          platforms[0],
      );
  }, [site]);
  return (
    <>
      <h1 className="flex items-center px-4 py-3 border-b justify-between">
        <div className="flex items-center text-2xl">
          <span>👋</span>
          <div className="ml-3 flex items-end">
            <span>{t('Hey there! Setup')}</span>
            <ProjectFormButton />
          </div>
        </div>
        <a href={"https://docs.openreplay.com/en/sdk/using-or/"} target="_blank">
          <Button size={"small"} type={"text"} className="ml-2 flex items-center gap-2">
            <CircleHelp size={14} />
            <div>{t('See Documentation')}</div>
          </Button>
        </a>
      </h1>
      <div className="p-4 flex gap-2 items-center">
        <span className="font-medium">{t('Project Type')}</span>
        <Segmented
          options={platforms}
          value={platform.value}
          onChange={(value) =>
            setPlatform(
              platforms.find(({ value: v }) => v === value) || platforms[0],
            )
          }
        />
      </div>
      <div className="p-4">
        {platform.value === 'web' ? (
          <Snippet site={site} />
        ) : (
          <MobileOnboardingTabs site={site} />
        )}
      </div>
      <div className="border-t px-4 py-3 flex justify-end">
        <Button
          type="primary"
          className=""
          onClick={() =>
            props.navTo ? props.navTo(OB_TABS.IDENTIFY_USERS) : null
          }
        >
          {t('Identify Users')}
          <Icon name="arrow-right-short" color="white" size={20} />
        </Button>
      </div>
    </>
  );
}

function Snippet({ site }: { site: Record<string, any> }) {
  const { t } = useTranslation();
  return (
    <>
      <div className="mb-6 text-lg font-medium">
        {t('Setup OpenReplay through NPM package')}&nbsp;
        <span className="text-sm">({t('recommended')})</span>&nbsp;
        {t('or script.')}
      </div>
      <OnboardingTabs site={site} />
    </>
  );
}

export default withOnboarding(
  withPageTitle('Project Setup - OpenReplay')(InstallOpenReplayTab),
);
