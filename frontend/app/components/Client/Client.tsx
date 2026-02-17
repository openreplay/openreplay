import React from 'react';
import { Navigate, withRouter } from 'App/routing';
import { client as clientRoute } from 'App/routes';
import { CLIENT_TABS } from 'App/utils/routeUtils';
import { PANEL_SIZES } from 'App/constants/panelSizes';

import SessionsListingSettings from 'Components/Client/SessionsListingSettings';
import Modules from 'Components/Client/Modules';
import ProfileSettings from './ProfileSettings';
import Integrations from './Integrations';
import UserView from './Users/UsersView';
import AuditView from './Audit/AuditView';
import Billing from './Billing/Billing';
import Projects from './Projects';
import CustomFields from './CustomFields';
import Webhooks from './Webhooks';
import Notifications from './Notifications';
import Roles from './Roles';
import ExportedVideosList from './ExportedVideos/ExportedVideosList';

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
