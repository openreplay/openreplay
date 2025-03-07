import React from 'react'
import { Button } from 'antd'
import { OB_TABS, onboarding as onboardingRoute, withSiteId } from 'App/routes'
import { sessions } from 'App/routes';
import { useStore } from 'App/mstore'
import { useParams, useNavigate } from "react-router";

const MENU_ITEMS = [OB_TABS.INSTALLING, OB_TABS.IDENTIFY_USERS, OB_TABS.MANAGE_USERS, OB_TABS.INTEGRATIONS]
const BTN_MSGS = [
  'Next: Identify Users',
  'Next: Invite Collaborators',
  'Next: Integrations',
  'See Recorded Sessions'
]

const OnboardingNavButton = () => {
  const { activeTab, siteId } = useParams();
  const navigate = useNavigate();
  const { userStore } = useStore();
  const activeIndex = MENU_ITEMS.findIndex(i => i === activeTab);
  const completed = activeIndex == MENU_ITEMS.length - 1;

  const setTab = () => {
    if (!completed) {
      const tab = MENU_ITEMS[activeIndex+1]
      navigate(withSiteId(onboardingRoute(tab), siteId));
    } else {
      onDone()
    }
  }

  const onDone = () => {
    userStore.setOnboarding(true);
    navigate(sessions());
  }
  
  return (
    <div className="flex items-center">
      <Button
        size="small"
        type="outline"
        onClick={onDone}
        className="float-left mr-2"
      >
        {activeIndex === 0 ? 'Done. See Recorded Sessions' : 'Skip Optional Steps and See Recorded Sessions'}
      </Button>
      
      <Button
        type="primary"
        onClick={setTab}
      >
        {BTN_MSGS[activeIndex]}
      </Button>
    </div>
  )
}

export default OnboardingNavButton