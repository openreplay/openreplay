import React from 'react';
import { withRouter } from 'react-router';
import { Button } from 'antd';
import {
  OB_TABS,
  onboarding as onboardingRoute,
  withSiteId,
  sessions,
} from 'App/routes';
import { useStore } from 'App/mstore';

const MENU_ITEMS = [
  OB_TABS.INSTALLING,
  OB_TABS.IDENTIFY_USERS,
  OB_TABS.MANAGE_USERS,
  OB_TABS.INTEGRATIONS,
];
const BTN_MSGS = [
  'Next: Identify Users',
  'Next: Invite Collaborators',
  'Next: Integrations',
  'See Recorded Sessions',
];

function OnboardingNavButton({
  match: {
    params: { activeTab, siteId },
  },
  history,
}) {
  const { userStore } = useStore();
  const activeIndex = MENU_ITEMS.findIndex((i) => i === activeTab);
  const completed = activeIndex == MENU_ITEMS.length - 1;

  const setTab = () => {
    if (!completed) {
      const tab = MENU_ITEMS[activeIndex + 1];
      history.push(withSiteId(onboardingRoute(tab), siteId));
    } else {
      onDone();
    }
  };

  const onDone = () => {
    userStore.setOnboarding(true);
    history.push(sessions());
  };

  return (
    <div className="flex items-center">
      <Button
        size="small"
        type="outline"
        onClick={onDone}
        className="float-left mr-2"
      >
        {activeIndex === 0
          ? 'Done. See Recorded Sessions'
          : 'Skip Optional Steps and See Recorded Sessions'}
      </Button>

      <Button type="primary" onClick={setTab}>
        {BTN_MSGS[activeIndex]}
      </Button>
    </div>
  );
}

export default withRouter(OnboardingNavButton);
