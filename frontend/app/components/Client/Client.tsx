import React from 'react';

import { PANEL_SIZES } from 'App/constants/panelSizes';
import { client as clientRoute } from 'App/routes';
import { Navigate, withRouter } from 'App/routing';
import { CLIENT_TABS } from 'App/utils/routeUtils';
import Modules from 'Components/Client/Modules';
import SessionsListingSettings from 'Components/Client/SessionsListingSettings';

import AuditView from './Audit/AuditView';
import Billing from './Billing/Billing';
import CustomFields from './CustomFields';
import ExportedVideosList from './ExportedVideos/ExportedVideosList';
import Integrations from './Integrations';
import Notifications from './Notifications';
import ProfileSettings from './ProfileSettings';
import Projects from './Projects';
import Roles from './Roles';
import UserView from './Users/UsersView';
import Webhooks from './Webhooks';

class Client extends React.PureComponent<any> {
  constructor(props) {
    super(props);
  }

  setTab = (tab) => {
    this.props.history.push(clientRoute(tab));
  };

  renderActiveTab = (activeTab) => {
    switch (activeTab) {
      case CLIENT_TABS.PROFILE:
        return <ProfileSettings />;
      case CLIENT_TABS.SESSION_SETTINGS:
        return <SessionsListingSettings />;
      case CLIENT_TABS.INTEGRATIONS:
        return <Integrations />;
      case CLIENT_TABS.MANAGE_USERS:
        return <UserView />;
      case CLIENT_TABS.SITES:
        return <Projects />;
      case CLIENT_TABS.CUSTOM_FIELDS:
        return <CustomFields />;
      case CLIENT_TABS.BILLING:
        return <Billing />;
      case CLIENT_TABS.WEBHOOKS:
        return <Webhooks />;
      case CLIENT_TABS.NOTIFICATIONS:
        return <Notifications />;
      case CLIENT_TABS.MANAGE_ROLES:
        return <Roles />;
      case CLIENT_TABS.AUDIT:
        return <AuditView />;
      case CLIENT_TABS.MODULES:
        return <Modules />;
      case CLIENT_TABS.VIDEOS:
        return <ExportedVideosList />;
      default:
        return <Navigate to={clientRoute(CLIENT_TABS.PROFILE)} replace />;
    }
  };

  render() {
    const {
      match: {
        params: { activeTab },
      },
    } = this.props;
    return (
      <div
        className="w-full mx-auto mb-8"
        style={{ maxWidth: PANEL_SIZES.maxWidth }}
      >
        {activeTab ? (
          this.renderActiveTab(activeTab)
        ) : (
          <Navigate to={clientRoute(CLIENT_TABS.PROFILE)} replace />
        )}
      </div>
    );
  }
}

export default withRouter(Client);
