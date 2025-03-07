import React from 'react';
import { Routes, Route, Navigate } from 'react-router';
import { CLIENT_TABS, client as clientRoute } from 'App/routes';

import ProfileSettings from './ProfileSettings';
import Integrations from './Integrations';
import UserView from './Users/UsersView';
import AuditView from './Audit/AuditView';
import Projects from './Projects';
import CustomFields from './CustomFields';
import Webhooks from './Webhooks';
import Notifications from './Notifications';
import Roles from './Roles';
import SessionsListingSettings from 'Components/Client/SessionsListingSettings';
import Modules from 'Components/Client/Modules';

function Client() {
  return (
    <div className='w-full mx-auto mb-8' style={{ maxWidth: '1360px' }}>
      <Routes>
        <Route exact strict path={clientRoute(CLIENT_TABS.PROFILE)} component={ProfileSettings} />
        <Route exact strict path={clientRoute(CLIENT_TABS.SESSIONS_LISTING)} component={SessionsListingSettings} />
        <Route exact strict path={clientRoute(CLIENT_TABS.INTEGRATIONS)} component={Integrations} />
        <Route exact strict path={clientRoute(CLIENT_TABS.MANAGE_USERS)} component={UserView} />
        <Route exact strict path={clientRoute(CLIENT_TABS.SITES)} component={Projects} />
        <Route exact strict path={clientRoute(CLIENT_TABS.CUSTOM_FIELDS)} component={CustomFields} />
        <Route exact strict path={clientRoute(CLIENT_TABS.WEBHOOKS)} component={Webhooks} />
        <Route exact strict path={clientRoute(CLIENT_TABS.NOTIFICATIONS)} component={Notifications} />
        <Route exact strict path={clientRoute(CLIENT_TABS.MANAGE_ROLES)} component={Roles} />
        <Route exact strict path={clientRoute(CLIENT_TABS.AUDIT)} component={AuditView} />
        <Route exact strict path={clientRoute(CLIENT_TABS.MODULES)} component={Modules} />
        <Route path={'*'}>
          <Navigate to={clientRoute(CLIENT_TABS.PROFILE)} />
        </Route>
      </Routes>
    </div>
  )
}

export default Client;