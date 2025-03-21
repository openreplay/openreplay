/* eslint-disable i18next/no-literal-string */
import { Segmented, Button } from 'antd';
import React from 'react';
import { HighlightCode, Icon } from 'UI';
import DocCard from 'Shared/DocCard/DocCard';
import { OB_TABS } from 'App/routes';
import withPageTitle from 'App/components/hocs/withPageTitle';
import withOnboarding, { WithOnboardingProps } from '../withOnboarding';
import MetadataList from '../MetadataList/MetadataList';
import CircleNumber from '../CircleNumber';
import { useTranslation } from 'react-i18next';

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

function IdentifyUsersTab(props: Props) {
  const { t } = useTranslation();
  const { site, platforms, platform, setPlatform, platformMap } = props;

  React.useEffect(() => {
    if (site.platform)
      setPlatform(
        platforms.find(({ value }) => value === platformMap[site.platform]) ??
          platform ??
          platforms[0],
      );
  }, [site]);

  return (
    <>
      <h1 className="flex items-center px-4 py-3 border-b justify-between">
        <div className="flex items-center text-2xl">
          <span>🕵️‍♂️</span>
          <div className="ml-3">{t('Identify Users')}</div>
        </div>

        <a
          href={`https://docs.openreplay.com/en/session-replay/identify-user${platform.value === "web" ? "/#with-npm" : "/#with-ios-app"}`}
          target="_blank"
          rel="noreferrer"
        >
          <Button
            size="small"
            type="text"
            className="ml-2 flex items-center gap-2"
          >
            <Icon name="question-circle" />
            <div className="text-main">{t('See Documentation')}</div>
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
      <div className="grid grid-cols-6 gap-4 w-full p-4">
        <div className="col-span-4">
          <div>
            <div className="font-medium mb-2 text-lg">
              {t('Identify users by user ID')}
            </div>
            <div className="mb-2">
              {t('Call')}&nbsp;<span className="highlight-blue">setUserID</span>
              &nbsp;{t('to identify your users when recording a session.')}
            </div>
          </div>

          {platform.value === 'web' ? (
            <HighlightCode
              className="js"
              text={"tracker.setUserID('john@doe.com');"}
            />
          ) : (
            <HighlightCode
              className="swift"
              text={"OpenReplay.shared.setUserID('john@doe.com');"}
            />
          )}
          {platform.value === 'web' ? (
            <div className="flex items-center my-2">
              <Icon name="info-circle" color="gray-darkest" />
              <span className="ml-2">
                {t('OpenReplay keeps the last communicated user ID.')}
              </span>
            </div>
          ) : null}
        </div>
        <div className="col-span-2">
          <DocCard
            title={t('Why to identify users?')}
            icon="question-lg"
            iconBgColor="bg-red-lightest"
            iconColor="red"
          >
            {t(
              'Make it easy to search and filter replays by user id. OpenReplayallows you to associate your internal-user-id with the recording.',
            )}
          </DocCard>
        </div>
      </div>

      <div className="border-t my-6" />

      <div className="grid grid-cols-6 gap-4 w-full p-4">
        <div className="col-span-4">
          <div>
            <div className="font-medium mb-2 text-lg">
              {t('Identify users by adding metadata')}
            </div>
            <p>
              {t(
                'To identify users through metadata, you will have to explicitly specify your user metadata so it can be injected during sessions. Follow the below steps',
              )}
            </p>
            <div className="flex items-center gap-2 mb-2">
              <CircleNumber text="1" />
              <MetadataList />
            </div>

            <div className="my-6" />
            <div className="flex items-start">
              <div>
                <CircleNumber text="2" />
                <span className="font-bold">
                  {t('Inject metadata when recording sessions')}
                </span>
              </div>
              <div className="pt-1 w-full">
                <div className="my-2">
                  {t('Use the')}&nbsp;
                  <span className="highlight-blue">setMetadata</span>{' '}
                  {t(
                    'method in your code to inject custom user data in the form of a key/value pair (string).',
                  )}
                </div>
                {platform.value === 'web' ? (
                  <HighlightCode
                    className="js"
                    text={"tracker.setMetadata('plan', 'premium');"}
                  />
                ) : (
                  <HighlightCode
                    className="swift"
                    text={"OpenReplay.shared.setMetadata('plan', 'premium');"}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="col-span-2">
          <DocCard title={t('What is Metadata?')} icon="lightbulb">
            {t(
              'Additional information about users can be provided with metadata (also known as traits or user variables). They take the form of key/value pairs, and are useful for filtering and searching for specific session replays.',
            )}
          </DocCard>
        </div>
      </div>

      <div className="border-t px-4 py-3 flex justify-end gap-4">
        <Button type="text" onClick={() => (props.skip ? props.skip() : null)}>
          {t('Skip')}
        </Button>
        <Button
          type="primary"
          className=""
          onClick={() =>
            props.navTo ? props.navTo(OB_TABS.MANAGE_USERS) : null
          }
        >
          {t('Invite Team Members')}
          <Icon name="arrow-right-short" color="white" size={20} />
        </Button>
      </div>
    </>
  );
}

export default withOnboarding(
  withPageTitle('Identify Users - OpenReplay')(IdentifyUsersTab),
);
