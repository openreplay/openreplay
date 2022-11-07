import React from 'react'
import { connect } from 'react-redux'
import { withRouter } from 'react-router'
import { Button } from 'UI'
import { OB_TABS, onboarding as onboardingRoute } from 'App/routes'
import * as routes from '../../../../routes'
import { sessions } from 'App/routes';
import { setOnboarding } from 'Duck/user';

const withSiteId = routes.withSiteId;
const MENU_ITEMS = [OB_TABS.INSTALLING, OB_TABS.IDENTIFY_USERS, OB_TABS.MANAGE_USERS, OB_TABS.INTEGRATIONS]
const BTN_MSGS = [
  'Next: Identify Users',
  'Next: Invite Collaborators',
  'Next: Integrations',
  'See Recorded Sessions'
]

const OnboardingNavButton = (props) => {
  const { match: { params: { activeTab, siteId } }, history } = props;
  const activeIndex = MENU_ITEMS.findIndex(i => i === activeTab);
  const completed = activeIndex == MENU_ITEMS.length - 1;

  const setTab = () => {
    if (!completed) {
      const tab = MENU_ITEMS[activeIndex+1]
      history.push(withSiteId(onboardingRoute(tab), siteId));
    } else {
      onDone()
    }
  }

  const onDone = () => {
    props.setOnboarding(true);
    history.push(sessions());
  }
  
  return (
    <div className="flex items-center">
      <Button
        size="small"
        variant="outline"
        onClick={onDone}
        className="float-left mr-2"
      >
        {activeIndex === 0 ? 'Done. See Recorded Sessions' : 'Skip Optional Steps and See Recorded Sessions'}
      </Button>
      
      <Button
        variant="primary"
        onClick={setTab}
      >
        {BTN_MSGS[activeIndex]}
      </Button>
    </div>
  )
}

export default withRouter(connect(null, { setOnboarding })(OnboardingNavButton))