import React from 'react'
import SideMenu from './components/SideMenu'
import { withRouter } from 'react-router-dom'
import { Switch, Route, Redirect } from 'react-router'
import { OB_TABS, onboarding as onboardingRoute } from 'App/routes'
import InstallOpenReplayTab from './components/InstallOpenReplayTab'
import IdentifyUsersTab from './components/IdentifyUsersTab'
import IntegrationsTab from './components/IntegrationsTab'
import ManageUsersTab from './components/ManageUsersTab'
import OnboardingNavButton from './components/OnboardingNavButton'
import * as routes from '../../routes'
import Crisp from 'Shared/Crisp'

const withSiteId = routes.withSiteId;

const Onboarding = (props) => {
  const { match: { params: { activeTab } } } = props;

  const route = path => {
    return withSiteId(onboardingRoute(path));
  }

  const renderActiveTab = () => (
    <Switch>
      <Route exact strict path={ route(OB_TABS.INSTALLING) } component={ () => <InstallOpenReplayTab /> } />
      <Route exact strict path={ route(OB_TABS.IDENTIFY_USERS) } component={ () => <IdentifyUsersTab /> } />
      <Route exact strict path={ route(OB_TABS.MANAGE_USERS) } component={ () => <ManageUsersTab /> } />
      <Route exact strict path={ route(OB_TABS.INTEGRATIONS) } component={ () => <IntegrationsTab /> } />
      <Redirect to={ route(OB_TABS.INSTALLING) } />
    </Switch>
  )

  return (
    <div className="page flex relative h-full" style={{ minHeight: '100vh', paddingBottom: '75px' }}>
      <div className="flex w-full">
        <div className="flex-1 flex bg-ray">
          <div className="pt-6 px-6" style={{ width: '250px'}}>
            <SideMenu />
          </div>
          <div className="bg-white flex-1 h-full px-6">
            { activeTab && renderActiveTab()}
          </div>
        </div>
      </div>
      <div className="py-6 px-4 w-full flex items-center fixed bottom-0 bg-white border-t z-10">
        <div className="crisp-chat" id="crisp-chat">
          <Crisp />
        </div>
        <div className="ml-auto">
          {/* <Button primary size="small" plain>Done. See Recoded Sessions</Button> */}
          <span className="mx-2"/>
          <OnboardingNavButton />
        </div>
      </div>
    </div>
  )
}

export default withRouter(Onboarding);