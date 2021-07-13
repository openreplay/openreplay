import { connect } from 'react-redux';
import { setSiteId } from 'Duck/user';
import { withRouter } from 'react-router-dom';
import { hasSiteId, siteChangeAvaliable } from 'App/routes';
import { STATUS_COLOR_MAP, GREEN } from 'Types/site';
import { Icon, SlideModal } from 'UI';
import { pushNewSite } from 'Duck/user'
import { init } from 'Duck/site';
import styles from './siteDropdown.css';
import cn from 'classnames';
import NewSiteForm from '../Client/Sites/NewSiteForm';

@withRouter
@connect(state => ({  
  sites: state.getIn([ 'site', 'list' ]),
  siteId: state.getIn([ 'user', 'siteId' ]),
}), {
  setSiteId,
  pushNewSite,
  init
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

  render() {
    const { sites, siteId, location: { pathname } } = this.props;
    const { showProductModal } = this.state;
    const activeSite = sites.find(s => s.id == siteId);
    const disabled = !siteChangeAvaliable(pathname);
    const showCurrent = hasSiteId(pathname) || siteChangeAvaliable(pathname);
    return (
      <div className={ styles.wrapper }>
        {
          showCurrent ?
            <div className={ activeSite && activeSite.status === GREEN ? styles.statusGreenIcon : styles.statusRedIcon }></div> :
            <Icon name="window-alt" size="14" marginRight="10" />
        }
        <div className={ styles.currentSite }>{ showCurrent && activeSite ? activeSite.host : 'All Projects' }</div>
        <Icon className={ styles.drodownIcon } color="gray-light" name="chevron-down" size="16" />
        <div className={styles.menu}>
          <ul data-can-disable={ disabled }>
            { !showCurrent && <li>{ 'Does not require domain selection.' }</li>}
            {
              sites.map(site => (
                <li key={ site.id } onClick={ () => this.props.setSiteId(site.id) }>
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
          <div
            className={cn(styles.btnNew, 'flex items-center justify-center py-3 cursor-pointer')}
            onClick={this.newSite}
          >
            <Icon 
              name="plus"
              size="12"
              marginRight="5" 
              color="teal"
            /> 
            <span className="color-teal">Add New Project</span>
          </div>
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
