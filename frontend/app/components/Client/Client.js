import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import { Switch, Route, Redirect } from 'react-router';
import { CLIENT_TABS, client as clientRoute } from 'App/routes';
import { fetchList as fetchMemberList } from 'Duck/member';
import { fetchList as fetchSiteList } from 'Duck/site';

import ProfileSettings from './ProfileSettings';
import Integrations from './Integrations';
import ManageUsers from './ManageUsers';
import Sites from './Sites';
import CustomFields from './CustomFields';
import Webhooks from './Webhooks';
import styles from './client.css';
import cn from 'classnames';
import PreferencesMenu from './PreferencesMenu';
import Notifications from './Notifications';
import Roles from './Roles';

@connect((state) => ({
  appearance: state.getIn([ 'user', 'account', 'appearance' ]),
}), {
  fetchMemberList,
  fetchSiteList,
})
@withRouter
export default class Client extends React.PureComponent {
  constructor(props){
    super(props);
    props.fetchMemberList();    
  } 

  setTab = (tab) => {
    this.props.history.push(clientRoute(tab));
  }

  renderActiveTab = (appearance) => (
    <Switch>
      <Route exact strict path={ clientRoute(CLIENT_TABS.PROFILE) } component={ ProfileSettings } />
      <Route exact strict path={ clientRoute(CLIENT_TABS.INTEGRATIONS) } component={ Integrations } />
      <Route exact strict path={ clientRoute(CLIENT_TABS.MANAGE_USERS) } component={ ManageUsers } />
      <Route exact strict path={ clientRoute(CLIENT_TABS.SITES) } component={ Sites } />      
      <Route exact strict path={ clientRoute(CLIENT_TABS.CUSTOM_FIELDS) } component={ CustomFields } />
      <Route exact strict path={ clientRoute(CLIENT_TABS.WEBHOOKS) } component={ Webhooks } />
      <Route exact strict path={ clientRoute(CLIENT_TABS.NOTIFICATIONS) } component={ Notifications } />
      <Route exact strict path={ clientRoute(CLIENT_TABS.MANAGE_ROLES) } component={ Roles } />
      <Redirect to={ clientRoute(CLIENT_TABS.PROFILE) } />
    </Switch>
  )

  render() {
    const { match: { params: { activeTab } }, appearance } = this.props;
    return (
      <div className={ cn(styles.wrapper, 'page-margin container-90') }>
        <div className={ styles.main }>
          <div className={ styles.tabMenu }>
            <PreferencesMenu activeTab={activeTab} />
          </div>
          <div className={ styles.tabContent }>
            { activeTab && this.renderActiveTab(appearance) }
          </div>
        </div>
      </div>
    );
  }
}
