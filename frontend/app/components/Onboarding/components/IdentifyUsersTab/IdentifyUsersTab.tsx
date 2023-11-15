import { Segmented } from 'antd';
import React from 'react';
import CircleNumber from '../CircleNumber';
import MetadataList from '../MetadataList/MetadataList';
import { HighlightCode, Icon, Button } from 'UI';
import DocCard from 'Shared/DocCard/DocCard';
import withOnboarding, { WithOnboardingProps } from '../withOnboarding';
import { OB_TABS } from 'App/routes';
import withPageTitle from 'App/components/hocs/withPageTitle';

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
}

function IdentifyUsersTab(props: Props) {
  const { site, platforms, platform, setPlatform } = props;

  React.useEffect(() => {
    if (site.platform)
      setPlatform(platforms.find(({ value }) => value === site.platform) || platforms[0]);
  }, [site]);

  return (
    <>
      <h1 className="flex items-center px-4 py-3 border-b justify-between">
        <div className="flex items-center text-2xl">
          <span>🕵️‍♂️</span>
          <div className="ml-3">Identify Users</div>
        </div>

        <a
          href="https://docs.openreplay.com/en/v1.10.0/installation/identify-user/"
          target="_blank"
        >
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
          onChange={(value) =>
            setPlatform(platforms.find(({ value: v }) => v === value) || platforms[0])
          }
        />
      </div>
      <div className="grid grid-cols-6 gap-4 w-full p-4">
        <div className="col-span-4">
          <div>
            <div className="font-medium mb-2 text-lg">Identify users by user ID</div>
            <div className="mb-2">
              Call <span className="highlight-blue">setUserID</span> to identify your users when
              recording a session.
            </div>
          </div>

          {platform.value === 'web' ? (
            <HighlightCode className="js" text={`tracker.setUserID('john@doe.com');`} />
          ) : (
            <HighlightCode className="swift" text={`OpenReplay.shared.setUserID('john@doe.com');`} />
          )}
          {platform.value === 'web' ? (
            <div className="flex items-center my-2">
              <Icon name="info-circle" color="gray-darkest" />
              <span className="ml-2">OpenReplay keeps the last communicated user ID.</span>
            </div>
          ) : null}
        </div>
        <div className="col-span-2">
          <DocCard
            title="Why to identify users?"
            icon="question-lg"
            iconBgColor="bg-red-lightest"
            iconColor="red"
          >
            Make it easy to search and filter replays by user id. OpenReplay allows you to associate
            your internal-user-id with the recording.
          </DocCard>
        </div>
      </div>

      <div className="border-t my-6" />

      <div className="grid grid-cols-6 gap-4 w-full p-4">
        <div className="col-span-4">
          <div>
            <div className="font-medium mb-2 text-lg">Identify users by adding metadata</div>
            <p>
              To identify users through metadata, you will have to explicitly specify your user
              metadata so it can be injected during sessions. Follow the below steps
            </p>
            <div className="flex items-start">
              <CircleNumber text="1" />
              <MetadataList />
            </div>

            <div className="my-6" />
            <div className="flex items-start">
              <CircleNumber text="2" />
              <div className="pt-1 w-full">
                <span className="font-bold">Inject metadata when recording sessions</span>
                <div className="my-2">
                  Use the <span className="highlight-blue">setMetadata</span> method in your code to
                  inject custom user data in the form of a key/value pair (string).
                </div>
                {platform.value === 'web' ? (
                  <HighlightCode className="js" text={`tracker.setMetadata('plan', 'premium');`} />
                ) : (
                  <HighlightCode
                    className="swift"
                    text={`OpenReplay.shared.setMetadata('plan', 'premium');`}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="col-span-2">
          <DocCard title="What is Metadata?" icon="lightbulb">
            Additional information about users can be provided with metadata (also known as traits
            or user variables). They take the form of key/value pairs, and are useful for filtering
            and searching for specific session replays.
          </DocCard>
        </div>
      </div>

      <div className="border-t px-4 py-3 flex justify-end gap-4">
        <Button variant="text-primary" onClick={() => (props.skip ? props.skip() : null)}>
          Skip
        </Button>
        <Button
          variant="primary"
          className=""
          onClick={() => (props.navTo ? props.navTo(OB_TABS.MANAGE_USERS) : null)}
        >
          Invite Team Members
          <Icon name="arrow-right-short" color="white" size={20} />
        </Button>
      </div>
    </>
  );
}

export default withOnboarding(withPageTitle('Identify Users - OpenReplay')(IdentifyUsersTab));
