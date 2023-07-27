import React from 'react';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import { Switch, Route, Redirect } from 'react-router';
import { CLIENT_TABS, client as clientRoute } from 'App/routes';

import ProfileSettings from './ProfileSettings';
import Integrations from './Integrations';
import UserView from './Users/UsersView';
import AuditView from './Audit/AuditView';
import Sites from './Sites';
import CustomFields from './CustomFields';
import Webhooks from './Webhooks';
import styles from './client.module.css';
import cn from 'classnames';
import PreferencesMenu from './PreferencesMenu';
import Notifications from './Notifications';
import Roles from './Roles';
import SessionsListingSettings from 'Components/Client/SessionsListingSettings';

interface MatchParams {
  activeTab?: string;
}

const Client: React.FC<RouteComponentProps<MatchParams>> = ({ match }) => {
  const { activeTab } = match.params;
  const isIntegrations = activeTab === CLIENT_TABS.INTEGRATIONS;

  const renderActiveTab = () => (
    <Switch>
      <Route exact strict path={clientRoute(CLIENT_TABS.PROFILE)} component={ProfileSettings} />
      <Route exact strict path={clientRoute(CLIENT_TABS.SESSIONS_LISTING)} component={SessionsListingSettings} />
      <Route exact strict path={clientRoute(CLIENT_TABS.INTEGRATIONS)} component={Integrations} />
      <Route exact strict path={clientRoute(CLIENT_TABS.MANAGE_USERS)} component={UserView} />
      <Route exact strict path={clientRoute(CLIENT_TABS.SITES)} component={Sites} />
      <Route exact strict path={clientRoute(CLIENT_TABS.CUSTOM_FIELDS)} component={CustomFields} />
      <Route exact strict path={clientRoute(CLIENT_TABS.WEBHOOKS)} component={Webhooks} />
      <Route exact strict path={clientRoute(CLIENT_TABS.NOTIFICATIONS)} component={Notifications} />
      <Route exact strict path={clientRoute(CLIENT_TABS.MANAGE_ROLES)} component={Roles} />
      <Route exact strict path={clientRoute(CLIENT_TABS.AUDIT)} component={AuditView} />
      <Redirect to={clientRoute(CLIENT_TABS.PROFILE)} />
    </Switch>
  );

  return (
    <div className={cn('page-margin container-90 flex relative')}>
      <div className={styles.tabMenu}>
        <PreferencesMenu activeTab={activeTab!} />
      </div>
      <div className={cn('side-menu-margined w-full', { 'bg-white rounded-lg border' : !isIntegrations })}>
        <div className='w-full mx-auto mb-8' style={{ maxWidth: '1300px' }}>
          {activeTab && renderActiveTab()}
        </div>
      </div>
    </div>
  );
};

export default withRouter(Client);
