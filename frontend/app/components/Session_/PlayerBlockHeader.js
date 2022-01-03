import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import { browserIcon, osIcon, deviceTypeIcon } from 'App/iconNames';
import { formatTimeOrDate } from 'App/date';
import { sessions as sessionsRoute, funnel as funnelRoute, funnelIssue as funnelIssueRoute, withSiteId } from 'App/routes';
import { Icon, CountryFlag, IconButton, BackLink } from 'UI';
import { toggleFavorite, setSessionPath } from 'Duck/sessions';
import cn from 'classnames';
import { connectPlayer } from 'Player';
import HeaderInfo from './HeaderInfo';
import SharePopup from '../shared/SharePopup/SharePopup';
import { fetchList as fetchListIntegration } from 'Duck/integrations/actions';

import stl from './playerBlockHeader.css';
import Issues from './Issues/Issues';
import Autoplay from './Autoplay';
import AssistActions from '../Assist/components/AssistActions';
import AssistTabs from '../Assist/components/AssistTabs';

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
@connect((state, props) => {
  const isAssist = state.getIn(['sessions', 'activeTab']).type === 'live';
  const hasSessioPath = state.getIn([ 'sessions', 'sessionPath' ]).includes('/sessions');
  return {
    session: state.getIn([ 'sessions', 'current' ]),
    sessionPath: state.getIn([ 'sessions', 'sessionPath' ]),
    loading: state.getIn([ 'sessions', 'toggleFavoriteRequest', 'loading' ]),
    disabled: state.getIn([ 'components', 'targetDefiner', 'inspectorMode' ]) || props.loading,
    jiraConfig: state.getIn([ 'issues', 'list' ]).first(),
    issuesFetched: state.getIn([ 'issues', 'issuesFetched' ]),
    local: state.getIn(['sessions', 'timezone']),
    funnelRef: state.getIn(['funnels', 'navRef']),
    siteId: state.getIn([ 'user', 'siteId' ]),
    funnelPage: state.getIn(['sessions', 'funnelPage']),
    hasSessionsPath: hasSessioPath && !isAssist,
  }
}, {
  toggleFavorite, fetchListIntegration, setSessionPath
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
    const { history, siteId, funnelPage, sessionPath } = this.props;
    // alert(sessionPath)
    if (sessionPath === history.location.pathname) {
      history.push(withSiteId(SESSIONS_ROUTE), siteId);
    } else {
      history.push(sessionPath ? sessionPath : withSiteId(SESSIONS_ROUTE, siteId));
    }
    // const funnelId = funnelPage && funnelPage.get('funnelId');
    // const issueId = funnelPage && funnelPage.get('issueId');
    // if (funnelId || issueId) {
    //   if (issueId) {
    //     history.push(withSiteId(funnelIssueRoute(funnelId, issueId), siteId))
    //   } else
    //     history.push(withSiteId(funnelRoute(funnelId), siteId));
    // } else 
    //   history.push(withSiteId(SESSIONS_ROUTE), siteId);
  }

  toggleFavorite = () => {
    const { session } = this.props;
    this.props.toggleFavorite(session.sessionId);
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
        live,
      },
      loading,
      // live,
      disabled,
      jiraConfig,
      fullscreen,
      hasSessionsPath
    } = this.props;
    // const { history, siteId } = this.props;
    const _live = live && !hasSessionsPath;

    return (
      <div className={ cn(stl.header, "flex justify-between", { "hidden" : fullscreen}) }>
        <div className="flex w-full">
          <BackLink	onClick={this.backHandler} label="Back" />
          
          <div className={ stl.divider } />
          
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
            { live && hasSessionsPath && (
              <div className={stl.liveSwitchButton} onClick={() => this.props.setSessionPath('')}>
                This Session is Now Continuing Live
              </div>
            )}
            { _live && <AssistTabs userId={userId} />}
            { _live && <AssistActions isLive userId={userId} /> }
            { !_live && (
              <>
                <Autoplay />
                <div className={ stl.divider } />
                <IconButton
                  className="mr-2"
                  tooltip="Bookmark"
                  onClick={ this.toggleFavorite }
                  loading={ loading }
                  icon={ favorite ? 'star-solid' : 'star' }                  
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
                      plain
                    />
                  }
                />
              </>
            )}
            { !_live && jiraConfig && jiraConfig.token && <Issues sessionId={ sessionId } /> }
          </div>
        </div>
      </div>
    );
  }
}
