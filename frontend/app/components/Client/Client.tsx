import React from 'react';
import { withRouter } from 'react-router-dom';
import { Switch, Route, Redirect } from 'react-router';
import { CLIENT_TABS, client as clientRoute } from 'App/routes';

import SessionsListingSettings from 'Components/Client/SessionsListingSettings';
import Modules from 'Components/Client/Modules';
import ProfileSettings from './ProfileSettings';
import Integrations from './Integrations';
import UserView from './Users/UsersView';
import AuditView from './Audit/AuditView';
import Sites from './Sites';
import Projects from './Projects';
import CustomFields from './CustomFields';
import Webhooks from './Webhooks';
import Notifications from './Notifications';
import Roles from './Roles';

@withRouter
export default class Client extends React.PureComponent {
  constructor(props) {
    super(props);
  }

  setTab = (tab) => {
    this.props.history.push(clientRoute(tab));
  };

  renderActiveTab = () => (
    <Switch>
      <Route
        exact
        strict
        path={clientRoute(CLIENT_TABS.PROFILE)}
        component={ProfileSettings}
      />
      <Route
        exact
        strict
        path={clientRoute(CLIENT_TABS.SESSIONS_LISTING)}
        component={SessionsListingSettings}
      />
      <Route
        exact
        strict
        path={clientRoute(CLIENT_TABS.INTEGRATIONS)}
        component={Integrations}
      />
      <Route
        exact
        strict
        path={clientRoute(CLIENT_TABS.MANAGE_USERS)}
        component={UserView}
      />
      <Route
        exact
        strict
        path={clientRoute(CLIENT_TABS.SITES)}
        component={Projects}
      />
      <Route
        exact
        strict
        path={clientRoute(CLIENT_TABS.CUSTOM_FIELDS)}
        component={CustomFields}
      />
      <Route
        exact
        strict
        path={clientRoute(CLIENT_TABS.WEBHOOKS)}
        component={Webhooks}
      />
      <Route
        exact
        strict
        path={clientRoute(CLIENT_TABS.NOTIFICATIONS)}
        component={Notifications}
      />
      <Route
        exact
        strict
        path={clientRoute(CLIENT_TABS.MANAGE_ROLES)}
        component={Roles}
      />
      <Route
        exact
        strict
        path={clientRoute(CLIENT_TABS.AUDIT)}
        component={AuditView}
      />
      <Route
        exact
        strict
        path={clientRoute(CLIENT_TABS.MODULES)}
        component={Modules}
      />
      <Redirect to={clientRoute(CLIENT_TABS.PROFILE)} />
    </Switch>
  );

  render() {
    const {
      match: {
        params: { activeTab },
      },
    } = this.props;
    return (
      <div className="w-full mx-auto mb-8" style={{ maxWidth: '1360px' }}>
        {activeTab && this.renderActiveTab()}
      </div>
    );
  }
}
