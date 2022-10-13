import React from 'react';
import { connect } from 'react-redux';
import { setSiteId } from 'Duck/site';
import { withRouter } from 'react-router-dom';
import { hasSiteId, siteChangeAvaliable } from 'App/routes';
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
  }

    render() {
        const {
            sites,
            siteId,
            account,
            location: { pathname },
        } = this.props;
        const isAdmin = account.admin || account.superAdmin;
        const activeSite = sites.find((s) => s.id == siteId);
        const disabled = !siteChangeAvaliable(pathname);
        const showCurrent = hasSiteId(pathname) || siteChangeAvaliable(pathname);

        return (
            <div className={styles.wrapper}>
                <div className={cn(styles.currentSite, 'ml-2')}>{showCurrent && activeSite ? activeSite.host : 'All Projects'}</div>
                <Icon className={styles.drodownIcon} color="gray-light" name="chevron-down" size="16" />
                <div className={styles.menu}>
                    <ul data-can-disable={disabled}>
                        {isAdmin && (
                            <NewProjectButton onClick={this.newSite} isAdmin={isAdmin} />
                        )}
                        {sites.map((site) => (
                            <li key={site.id} onClick={() => this.switchSite(site.id)}>
                                <Icon name="folder2" size="16" />
                                <span className="ml-3">{site.host}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        );
    }
}
