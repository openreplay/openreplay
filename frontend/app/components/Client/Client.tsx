import { Loader } from '@/ui/feedback/Loader';
import React from 'react';

import { client as clientRoute } from 'App/routes';
import { Navigate, withRouter } from 'App/routing';
import { CLIENT_TABS } from 'App/utils/routeUtils';
import { agentTestsEnabled, anyAgentEnabled } from 'App/utils/split-utils';

import PreferencesShell from './PreferencesShell';

/* One chunk per tab: the shell no longer ships Synthetics, audit, billing and
   the rest to someone opening Account. Same module paths, so the saas overlay
   still replaces them. */
const Modules = React.lazy(() => import('Components/Client/Modules'));
const SessionsListingSettings = React.lazy(
  () => import('Components/Client/SessionsListingSettings'),
);
const AgentsPreferences = React.lazy(() => import('./AgentsPreferences'));
const AuditView = React.lazy(() => import('./Audit/AuditView'));
const Billing = React.lazy(() => import('./Billing/Billing'));
const ClientSaas = React.lazy(() => import('./ClientSaas'));
const ExportedVideosList = React.lazy(
  () => import('./ExportedVideos/ExportedVideosList'),
);
const Integrations = React.lazy(() => import('./Integrations'));
const Notifications = React.lazy(() => import('./Notifications'));
const ProfileSettings = React.lazy(() => import('./ProfileSettings'));
const Projects = React.lazy(() => import('./Projects'));
const Roles = React.lazy(() => import('./Roles'));
const SmartTests = React.lazy(() => import('./SmartTests'));
const UserView = React.lazy(() => import('./Users/UsersView'));
const Webhooks = React.lazy(() => import('./Webhooks'));

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
        // metadata keys are per project: they live under Projects now
        return (
          <Navigate
            to={`${clientRoute(CLIENT_TABS.SITES)}?tab=metadata`}
            replace
          />
        );
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
      case CLIENT_TABS.AGENTS:
        return anyAgentEnabled() ? (
          <AgentsPreferences />
        ) : (
          <Navigate to={clientRoute(CLIENT_TABS.PROFILE)} replace />
        );
      case CLIENT_TABS.MODULES:
        return <Modules />;
      case CLIENT_TABS.VIDEOS:
        return <ExportedVideosList />;
      case CLIENT_TABS.TEST_AGENTS:
        return agentTestsEnabled() ? (
          <SmartTests />
        ) : (
          <Navigate to={clientRoute(CLIENT_TABS.PROFILE)} replace />
        );
      default:
        return <ClientSaas activeTab={activeTab} />;
    }
  };

  render() {
    const {
      match: {
        params: { activeTab },
      },
    } = this.props;
    return activeTab ? (
      <PreferencesShell>
        <React.Suspense fallback={<Loader />}>
          {this.renderActiveTab(activeTab)}
        </React.Suspense>
      </PreferencesShell>
    ) : (
      <Navigate to={clientRoute(CLIENT_TABS.PROFILE)} replace />
    );
  }
}

export default withRouter(Client);
