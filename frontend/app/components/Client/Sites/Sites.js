import { connect } from 'react-redux';
import cn from 'classnames';
import withPageTitle from 'HOCs/withPageTitle';
import { Loader, SlideModal, IconButton, Icon, Button, Popup, TextLink } from 'UI';
import { init, remove, fetchGDPR } from 'Duck/site';
import { RED, YELLOW, GREEN, STATUS_COLOR_MAP } from 'Types/site';
import stl from './sites.css';
import NewSiteForm from './NewSiteForm';
import GDPRForm from './GDPRForm';
import TrackingCodeModal from 'Shared/TrackingCodeModal';
import BlockedIps from './BlockedIps';
import { confirm } from 'UI/Confirmation';

const STATUS_MESSAGE_MAP = {
  [ RED ]: ' There seems to be an issue (please verify your installation)',
  [ YELLOW ]: 'We\'re collecting data from time to time (perhaps low traffic)',
  [ GREEN ]: 'All good!',
};

const PERMISSION_WARNING = 'You don’t have the permissions to perform this action.';
const LIMIT_WARNING = 'You have reached site limit.';

const BLOCKED_IPS = 'BLOCKED_IPS';
const NONE = 'NONE';

const NEW_SITE_FORM = 'NEW_SITE_FORM';
const GDPR_FORM = 'GDPR_FORM';

@connect(state => ({
  site: state.getIn([ 'site', 'instance' ]),
  sites: state.getIn([ 'site', 'list' ]),
  loading: state.getIn([ 'site', 'loading' ]),
  user: state.getIn([ 'user', 'account' ]),
  account: state.getIn([ 'user', 'account' ]),
}), {
  init,
  remove,
  fetchGDPR
})
@withPageTitle('Projects - OpenReplay Preferences')
class Sites extends React.PureComponent {
  state = { 
    showTrackingCode: false, 
    modalContent: NONE,
    detailContent: NONE,
  };

  toggleBlockedIp = () => {
    this.setState({ 
      detailContent: this.state.detailContent === BLOCKED_IPS ? NONE : BLOCKED_IPS,
    });
  };

  closeModal = () => this.setState({ modalContent: NONE, detailContent: NONE });

  edit = site => {
    this.props.init(site)
    this.setState({ modalContent: NEW_SITE_FORM });
  }

  remove = async (site) => {
    if (await confirm({
      header: 'Projects',
      confirmation: `Are you sure you want to delete this Project? We won't be able to record anymore sessions.`
    })) {
      this.props.remove(site.id);
    }
  };

  showGDPRForm = (site) => {
    this.props.init(site);
    this.setState({ modalContent: GDPR_FORM });
  };

  showNewSiteForm = () => {
    this.props.init();
    this.setState({ modalContent: NEW_SITE_FORM });
  };

  showTrackingCode = (site) => {
    this.props.init(site);
    this.setState({ showTrackingCode: true });
  };

  getModalTitle() {
    switch (this.state.modalContent) {
      case NEW_SITE_FORM:
        return 'New Project';
      case GDPR_FORM:
        return 'Project Settings';
      default:
        return '';
    }
  }

  renderModalContent() {
    switch (this.state.modalContent) {
      case NEW_SITE_FORM:
        return <NewSiteForm onClose={ this.closeModal } />;
      case GDPR_FORM:
        return <GDPRForm onClose={ this.closeModal } toggleBlockedIp={ this.toggleBlockedIp } />
      default:
        return null;
    }
  }

  renderModalDetailContent() {
    switch (this.state.detailContent) {
      case BLOCKED_IPS:
        return <BlockedIps />;
      default:
        return null;
    }
  }

  render() {
    const { loading, sites, site, user, account } = this.props;
    const { modalContent, showTrackingCode } = this.state;
    const isAdmin = user.admin || user.superAdmin;
    const canAddSites = isAdmin && account.limits.projects && account.limits.projects.remaining !== 0;
    const canDeleteSites = sites.size > 1 && isAdmin;

    return (
      <Loader loading={ loading }>
        <TrackingCodeModal
          title="Tracking Code"
          subTitle={`(Unique to ${ site.host })`}
          displayed={ showTrackingCode }
          onClose={ () => this.setState({ showTrackingCode: false }) }
          site={ site }
        />
        <SlideModal
          title={ this.getModalTitle() }
          size="small"
          isDisplayed={ modalContent !== NONE }
          content={ this.renderModalContent() }
          onClose={ this.closeModal }
          detailContent={ this.renderModalDetailContent() }
        />
        <div className={ stl.wrapper }>
          <div className={ stl.tabHeader }>
            <h3 className={ cn(stl.tabTitle, "text-2xl") }>{ 'Projects' }</h3>
            <Popup
              trigger={
                <div>
                  <IconButton
                      disabled={ !canAddSites }
                      circle
                      icon="plus"
                      outline
                      onClick={ this.showNewSiteForm }
                  />
                </div>
              }
              disabled={ canAddSites }
              content={ `${ !isAdmin ? PERMISSION_WARNING : LIMIT_WARNING }` }
              size="tiny"
              inverted
              position="top left"
            />

          <TextLink
            icon="book"
            className="ml-auto"
            href="https://docs.openreplay.com/installation"
            label="Documentation"
          />
          </div>

          <div className={ stl.list }>
            {
              sites.map(_site => (
                <div key={ _site.key } className={ stl.site } data-inactive={ _site.status === RED }>
                  <div className="flex items-center">
                    <Popup
                      trigger={
                        <div style={ { width: '10px' } }>
                          <Icon name="circle" size="10" color={ STATUS_COLOR_MAP[ _site.status ] } />
                        </div>
                      }
                      content={ STATUS_MESSAGE_MAP[ _site.status ] }
                      inverted
                      position="top center"
                    />
                    <div className="ml-3 flex items-center">
                      <div>{ _site.host }</div>
                      <div className={ stl.label}>{_site.projectKey}</div>
                    </div>
                  </div>
                  <div className={ stl.actions }>
                    <button
                      className={cn({'hidden' : !canDeleteSites})}                      
                      disabled={ !canDeleteSites }
                      onClick={ () => canDeleteSites && this.remove(_site) }
                    >
                      <Icon name="trash" size="16" color="teal" />
                    </button>
                    <button
                      className={cn({'hidden' : !isAdmin})}
                      disabled={ !isAdmin }
                      onClick={ () => isAdmin && this.edit(_site) }
                      data-clickable
                    >
                      <Icon name="edit" size="16" color="teal"/>
                    </button>
                    <div><Button size="small" outline primary onClick={ () => this.showTrackingCode(_site) }>{ 'Tracking Code' }</Button></div>
                    {/* <button disabled={ !isAdmin } onClick={ () => this.showGDPRForm(_site) } ><Icon name="cog" size="16" color="teal" /></button> */}
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      </Loader>
    );
  }
}

export default Sites;
