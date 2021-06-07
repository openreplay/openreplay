import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import { browserIcon, osIcon, deviceTypeIcon } from 'App/iconNames';
import { formatTimeOrDate } from 'App/date';
import { sessions as sessionsRoute, funnelIssue as funnelIssueRoute, withSiteId } from 'App/routes';
import { Icon, CountryFlag, IconButton, BackLink } from 'UI';
import { toggleFavorite } from 'Duck/sessions';
import cn from 'classnames';
import { connectPlayer } from 'Player';
import HeaderInfo from './HeaderInfo';
import SharePopup from '../shared/SharePopup/SharePopup';
import { fetchList as fetchListIntegration } from 'Duck/integrations/actions';

import cls from './playerBlockHeader.css';
import Issues from './Issues/Issues';
import Autoplay from './Autoplay';

const SESSIONS_ROUTE = sessionsRoute();

function capitalise(str) {
  return str[0].toUpperCase() + str.slice(1);
}
@connectPlayer(state => ({
  width: state.width,
  height: state.height,
  live: state.live,
  loading: state.cssLoading || state.messagesLoading,
}))
@connect((state, props) => ({
  session: state.getIn([ 'sessions', 'current' ]),
  loading: state.getIn([ 'sessions', 'toggleFavoriteRequest', 'loading' ]),
  disabled: state.getIn([ 'components', 'targetDefiner', 'inspectorMode' ]) || props.loading,
  jiraConfig: state.getIn([ 'issues', 'list' ]).first(),
  issuesFetched: state.getIn([ 'issues', 'issuesFetched' ]),
  local: state.getIn(['sessions', 'timezone']),
  funnelRef: state.getIn(['funnels', 'navRef']),
  siteId: state.getIn([ 'user', 'siteId' ]),
}), {
  toggleFavorite, fetchListIntegration
})
@withRouter
export default class PlayerBlockHeader extends React.PureComponent {
  componentDidMount() {    
    if (!this.props.issuesFetched)
      this.props.fetchListIntegration('issues')
  }

  getDimension = (width, height) => (
    <div className="flex items-center">
      { width || 'x' } <Icon name="close" size="12" className="mx-1" /> { height || 'x' }
    </div>
  );

  backHandler = () => {
    const { funnelRef, history, siteId } = this.props;    
    if (history.action !== 'POP')
      history.goBack();
    else 
      history.push(withSiteId(SESSIONS_ROUTE), siteId);    
    // if (funnelRef) {
    //   history.push(withSiteId(funnelIssueRoute(funnelRef.funnelId, funnelRef.issueId), funnelRef.siteId));
    // } else {
    //   history.push(withSiteId(SESSIONS_ROUTE), siteId);
    // }
  }

  toggleFavorite = () => {
    const { session } = this.props;
    this.props.toggleFavorite(session);
  }

  render() {
    const {
      width,
      height,
      session: {
        sessionId,
        userCountry,
        userId,
        favorite,
        startedAt,
        userBrowser,
        userOs,
        userDevice,
        userBrowserVersion,
        userDeviceType,
      },
      loading,
      live,
      disabled,
      jiraConfig,
      fullscreen
    } = this.props;

    return (
      <div className={ cn(cls.header, "flex justify-between", { "hidden" : fullscreen}) }>
        <div className="flex w-full">
          <BackLink	onClick={this.backHandler} label="Back" />
          
          <div className={ cls.divider } />
          
          <div className="mx-4 flex items-center">
            <CountryFlag country={ userCountry } />
            <div className="ml-2 font-normal color-gray-dark mt-1 text-sm">
              { formatTimeOrDate(startedAt) } <span>{ this.props.local === 'UTC' ? 'UTC' : ''}</span>
            </div>
          </div>

          <HeaderInfo icon={ browserIcon(userBrowser) } label={ `v${ userBrowserVersion }` } />
          <HeaderInfo icon={ deviceTypeIcon(userDeviceType) } label={ capitalise(userDevice) } />
          <HeaderInfo icon="expand-wide" label={ this.getDimension(width, height) } />
          <HeaderInfo icon={ osIcon(userOs) } label={ userOs } />

          <div className='ml-auto flex items-center'>
            <Autoplay />
            <div className={ cls.divider } />
            <IconButton
              className="mr-2"
              tooltip="Bookmark"
              onClick={ this.toggleFavorite }
              loading={ loading }
              icon={ favorite ? 'star-solid' : 'star' }
              // label={ favorite ? 'Favourited' : 'Favourite' }
              plain
            />
            <SharePopup
              entity="sessions"
              id={ sessionId }
              trigger={
                <IconButton
                  className="mr-2"
                  tooltip="Share Session"
                  disabled={ disabled }
                  icon={ 'share-alt' }
                  //label="Share"
                  plain
                />
              }
            />
            { !live && jiraConfig && jiraConfig.token && <Issues sessionId={ sessionId } /> }
          </div>
        </div>
      </div>
    );
  }
}
