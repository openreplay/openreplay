import React from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import { Switch, Route, Redirect } from 'react-router';
import { CLIENT_TABS, client as clientRoute } from 'App/routes';
import { fetchList as fetchMemberList } from 'Duck/member';

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

@connect(null, { fetchMemberList, })
@withRouter
export default class Client extends React.PureComponent {
  constructor(props){
    super(props);
  } 

  setTab = (tab) => {
    this.props.history.push(clientRoute(tab));
  }

  renderActiveTab = () => (
    <Switch>
      <Route exact strict path={ clientRoute(CLIENT_TABS.PROFILE) } component={ ProfileSettings } />
      <Route exact strict path={ clientRoute(CLIENT_TABS.INTEGRATIONS) } component={ Integrations } />
      <Route exact strict path={ clientRoute(CLIENT_TABS.MANAGE_USERS) } component={ UserView } />
      <Route exact strict path={ clientRoute(CLIENT_TABS.SITES) } component={ Sites } />      
      <Route exact strict path={ clientRoute(CLIENT_TABS.CUSTOM_FIELDS) } component={ CustomFields } />
      <Route exact strict path={ clientRoute(CLIENT_TABS.WEBHOOKS) } component={ Webhooks } />
      <Route exact strict path={ clientRoute(CLIENT_TABS.NOTIFICATIONS) } component={ Notifications } />
      <Route exact strict path={ clientRoute(CLIENT_TABS.MANAGE_ROLES) } component={ Roles } />
      <Route exact strict path={ clientRoute(CLIENT_TABS.AUDIT) } component={ AuditView } />
      <Redirect to={ clientRoute(CLIENT_TABS.PROFILE) } />
    </Switch>
  )

  render() {
    const { match: { params: { activeTab } } } = this.props;
    return (
      <div className={ cn(styles.wrapper, 'page-margin container-90') }>
        <div className={ styles.main }>
          <div className={ styles.tabMenu }>
            <PreferencesMenu activeTab={activeTab} />
          </div>
          <div className="bg-white w-full rounded-lg mx-4 my-6 border">
            { activeTab && this.renderActiveTab() }
          </div>
        </div>
      </div>
    );
  }
}
