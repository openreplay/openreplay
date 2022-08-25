import React from 'react';
import { connect } from 'react-redux';
import { setSiteId } from 'Duck/site';
import { withRouter } from 'react-router-dom';
import { hasSiteId, siteChangeAvaliable } from 'App/routes';
import { STATUS_COLOR_MAP, GREEN } from 'Types/site';
import { Icon } from 'UI';
import { pushNewSite } from 'Duck/user';
import { init } from 'Duck/site';
import styles from './siteDropdown.module.css';
import cn from 'classnames';
import { clearSearch } from 'Duck/search';
import { clearSearch as clearSearchLive } from 'Duck/liveSearch';
import { fetchListActive as fetchIntegrationVariables } from 'Duck/customField';
import { withStore } from 'App/mstore';
import AnimatedSVG, { ICONS } from '../shared/AnimatedSVG/AnimatedSVG';
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
        const { showProductModal } = this.state;
        const isAdmin = account.admin || account.superAdmin;
        const activeSite = sites.find((s) => s.id == siteId);
        const disabled = !siteChangeAvaliable(pathname);
        const showCurrent = hasSiteId(pathname) || siteChangeAvaliable(pathname);
        // const canAddSites = isAdmin && account.limits.projects && account.limits.projects.remaining !== 0;

        return (
            <div className={styles.wrapper}>
                {showCurrent ? (
                    activeSite && activeSite.status === GREEN ? (
                        <AnimatedSVG name={ICONS.SIGNAL_GREEN} size="10" />
                    ) : (
                        <AnimatedSVG name={ICONS.SIGNAL_RED} size="10" />
                    )
                ) : (
                    <Icon name="window-alt" size="14" marginRight="10" />
                )}
                <div className={cn(styles.currentSite, 'ml-2')}>{showCurrent && activeSite ? activeSite.host : 'All Projects'}</div>
                <Icon className={styles.drodownIcon} color="gray-light" name="chevron-down" size="16" />
                <div className={styles.menu}>
                    <ul data-can-disable={disabled}>
                        {!showCurrent && <li>{'Project selection is not applicable.'}</li>}
                        {sites.map((site) => (
                            <li key={site.id} onClick={() => this.switchSite(site.id)}>
                                <div className="w-2 h-2 rounded-full mr-3" style={{ backgroundColor: STATUS_COLOR_MAP[site.status] }} />
                                {site.host}
                            </li>
                        ))}
                    </ul>
                    <NewProjectButton onClick={this.newSite} isAdmin={isAdmin} />
                </div>
            </div>
        );
    }
}
