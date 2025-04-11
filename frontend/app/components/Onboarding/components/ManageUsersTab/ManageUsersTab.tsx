import UsersView from 'App/components/Client/Users/UsersView';
import DocCard from 'Shared/DocCard/DocCard';
import React from 'react';
import { Icon } from 'UI';
import { OB_TABS } from 'App/routes';
import withPageTitle from 'App/components/hocs/withPageTitle';
import { Button } from 'antd';
import withOnboarding, { WithOnboardingProps } from '../withOnboarding';
import { useTranslation } from 'react-i18next';

interface Props extends WithOnboardingProps {}

function ManageUsersTab(props: Props) {
  const { t } = useTranslation();
  return (
    <>
      <h1 className="flex items-center px-4 py-3 border-b justify-between">
        <div className="flex items-center text-2xl">
          {/* eslint-disable-next-line i18next/no-literal-string */}
          <span>👨‍💻</span>
          <div className="ml-3">{t('Invite Collaborators')}</div>
        </div>

        <a
          href="https://docs.openreplay.com/en/deployment/invite-team-members"
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
      <div className="grid grid-cols-6 gap-4 p-4">
        <div className="col-span-4">
          <UsersView isOnboarding />
        </div>
        <div className="col-span-2">
          <DocCard
            title="Why Invite Collaborators?"
            icon="question-lg"
            iconBgColor="bg-red-lightest"
            iconColor="red"
          >
            <p>
              {t(
                'Come together and unlock the potential collaborative improvements!',
              )}
            </p>
            <p>
              {t(
                'Session replays are useful to developers, designers, product managers and to everyone on the product team.',
              )}
            </p>
          </DocCard>
        </div>
      </div>
      <div className="border-t px-4 py-3 flex justify-end">
        <Button type="text" onClick={() => (props.skip ? props.skip() : null)}>
          {t('Skip')}
        </Button>
        <Button
          type="primary"
          onClick={() =>
            props.navTo ? props.navTo(OB_TABS.INTEGRATIONS) : null
          }
          icon={<Icon name="arrow-right-short" color="white" size={20} />}
          iconPosition="end"
        >
          {t('Configure Integrations')}
        </Button>
      </div>
    </>
  );
}

export default withOnboarding(
  withPageTitle('Invite Collaborators - OpenReplay')(ManageUsersTab),
);
