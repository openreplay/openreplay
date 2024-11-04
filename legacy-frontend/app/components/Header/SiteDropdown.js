import React from 'react';
import { connect } from 'react-redux';
import { setSiteId } from 'Duck/site';
import { withRouter } from 'react-router-dom';
import { hasSiteId, siteChangeAvailable } from 'App/routes';
import { Icon } from 'UI';
import { pushNewSite } from 'Duck/user';
import { init } from 'Duck/site';
import styles from './siteDropdown.module.css';
import cn from 'classnames';
import { clearSearch } from 'Duck/search';
import { clearSearch as clearSearchLive } from 'Duck/liveSearch';
import { fetchListActive as fetchIntegrationVariables } from 'Duck/customField';
import { withStore } from 'App/mstore';
import NewProjectButton from './NewProjectButton';

@withStore
@withRouter
@connect(
  (state) => ({
    sites: state.getIn(['site', 'list']),
    siteId: state.getIn(['site', 'siteId']),
    account: state.getIn(['user', 'account']),
  }),
  {
    setSiteId,
    pushNewSite,
    init,
    clearSearch,
    clearSearchLive,
    fetchIntegrationVariables,
  }
)
export default class SiteDropdown extends React.PureComponent {
  state = { showProductModal: false };

  closeModal = (e, newSite) => {
    this.setState({ showProductModal: false });
  };

  newSite = () => {
    this.props.init({});
    this.setState({ showProductModal: true });
  };

  switchSite = (siteId) => {
    const { mstore, location } = this.props;

    this.props.setSiteId(siteId);
    this.props.fetchIntegrationVariables();
    this.props.clearSearch(location.pathname.includes('/sessions'));
    this.props.clearSearchLive();

    mstore.initClient();
  };

  render() {
    const {
      sites,
      siteId,
      account,
      location: { pathname },
    } = this.props;
    const isAdmin = account.admin || account.superAdmin;
    const activeSite = sites.find((s) => s.id == siteId);
    const disabled = !siteChangeAvailable(pathname);
    const showCurrent = hasSiteId(pathname) || siteChangeAvailable(pathname);

    return (
      <div style={{ width: '180px'}}>
        <div className={styles.wrapper}>
          <div className={cn(styles.currentSite)}>
            {showCurrent && activeSite ? activeSite.host : 'All Projects'}
          </div>
          <Icon className={styles.dropdownIcon} color="gray-dark" name="chevron-down" size="16" />
          <div className={styles.menu}>
            <ul data-can-disable={disabled}>
              {isAdmin && <NewProjectButton onClick={this.newSite} isAdmin={isAdmin} />}
              <div className="border-b border-dashed my-1" />
              {sites.map((site) => (
                <li key={site.id} onClick={() => this.switchSite(site.id)}>
                  <Icon name={site.platform === 'web' ? 'browser/browser' : 'mobile'} size="16" />
                  <span className="ml-3">{site.host}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  }
}
