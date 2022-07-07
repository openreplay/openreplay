import React from 'react';
import { connect } from 'react-redux';
import { setSiteId } from 'Duck/site';
import { withRouter } from 'react-router-dom';
import { hasSiteId, siteChangeAvaliable, isRoute } from 'App/routes';
import { STATUS_COLOR_MAP, GREEN } from 'Types/site';
import { Icon, SlideModal } from 'UI';
import { pushNewSite } from 'Duck/user'
import { init } from 'Duck/site';
import styles from './siteDropdown.module.css';
import cn from 'classnames';
import NewSiteForm from '../Client/Sites/NewSiteForm';
import { clearSearch } from 'Duck/search';
import { fetchList as fetchIntegrationVariables } from 'Duck/customField';
import { withStore } from 'App/mstore'
import AnimatedSVG, { ICONS } from '../shared/AnimatedSVG/AnimatedSVG';
import NewProjectButton from './NewProjectButton';

@withStore
@withRouter
@connect(state => ({  
  sites: state.getIn([ 'site', 'list' ]),
  siteId: state.getIn([ 'site', 'siteId' ]),
  account: state.getIn([ 'user', 'account' ]),
}), {
  setSiteId,
  pushNewSite,
  init,
  clearSearch,
  fetchIntegrationVariables,
})
export default class SiteDropdown extends React.PureComponent {
  state = { showProductModal: false }

  closeModal = (e, newSite) => {
    this.setState({ showProductModal: false })    
  };

  newSite = () => {
    this.props.init({})
    this.setState({showProductModal: true})
  }

  switchSite = (siteId) => {
    const { mstore, location } = this.props

    this.props.setSiteId(siteId);
    this.props.clearSearch(location.pathname.includes('/sessions'));
    this.props.fetchIntegrationVariables();

    mstore.initClient();
  }

  render() {
    const { sites, siteId, account, location: { pathname } } = this.props;
    const { showProductModal } = this.state;
    const isAdmin = account.admin || account.superAdmin;
    const activeSite = sites.find(s => s.id == siteId);
    const disabled = !siteChangeAvaliable(pathname);
    const showCurrent = hasSiteId(pathname) || siteChangeAvaliable(pathname);
    // const canAddSites = isAdmin && account.limits.projects && account.limits.projects.remaining !== 0;

    return (
      <div className={ styles.wrapper }>
        {
          showCurrent ?
            (activeSite && activeSite.status === GREEN) ? <AnimatedSVG name={ICONS.SIGNAL_GREEN} size="10" /> : <AnimatedSVG name={ICONS.SIGNAL_RED} size="10" /> :
            <Icon name="window-alt" size="14" marginRight="10" />
        }
        <div className={ cn(styles.currentSite, 'ml-2')}>{ showCurrent && activeSite ? activeSite.host : 'All Projects' }</div>
        <Icon className={ styles.drodownIcon } color="gray-light" name="chevron-down" size="16" />
        <div className={styles.menu}>
          <ul data-can-disable={ disabled }>
            { !showCurrent && <li>{ 'Does not require domain selection.' }</li>}
            {
              sites.map(site => (
                <li key={ site.id } onClick={() => this.switchSite(site.id)}>
                  <Icon 
                    name="circle"
                    size="8"
                    marginRight="10" 
                    color={ STATUS_COLOR_MAP[ site.status ] } 
                  /> 
                  { site.host }
                </li>
              ))
            }
          </ul>
          <NewProjectButton onClick={this.newSite} isAdmin={isAdmin} />
        </div>

        <SlideModal
          title="New Project"
          size="small"
          isDisplayed={ showProductModal }
          content={ showProductModal && <NewSiteForm onClose={ this.closeModal } /> }
          onClose={ this.closeModal }          
        />
      </div>
    );
  }
}
