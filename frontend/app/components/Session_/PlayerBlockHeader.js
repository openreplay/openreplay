import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import { browserIcon, osIcon, deviceTypeIcon } from 'App/iconNames';
import { formatTimeOrDate } from 'App/date';
import { sessions as sessionsRoute, assist as assistRoute, liveSession as liveSessionRoute, withSiteId } from 'App/routes';
import { Icon, CountryFlag, IconButton, BackLink, Popup, Link } from 'UI';
import { toggleFavorite, setSessionPath } from 'Duck/sessions';
import cn from 'classnames';
import { connectPlayer } from 'Player';
// import HeaderInfo from './HeaderInfo';
import SharePopup from '../shared/SharePopup/SharePopup';
import { fetchList as fetchListIntegration } from 'Duck/integrations/actions';
import { countries } from 'App/constants';
import SessionMetaList from 'Shared/SessionItem/SessionMetaList';

import stl from './playerBlockHeader.css';
import Issues from './Issues/Issues';
import Autoplay from './Autoplay';
import AssistActions from '../Assist/components/AssistActions';
import AssistTabs from '../Assist/components/AssistTabs';
import SessionInfoItem from './SessionInfoItem'

const SESSIONS_ROUTE = sessionsRoute();
const ASSIST_ROUTE = assistRoute();
@connectPlayer(state => ({
  width: state.width,
  height: state.height,
  live: state.live,
  loading: state.cssLoading || state.messagesLoading,
}))
@connect((state, props) => {
  const isAssist = window.location.pathname.includes('/assist/');
  const hasSessioPath = state.getIn([ 'sessions', 'sessionPath' ]).includes('/sessions');
  const session = state.getIn([ 'sessions', 'current' ]);
  return {
    session,
    sessionPath: state.getIn([ 'sessions', 'sessionPath' ]),
    loading: state.getIn([ 'sessions', 'toggleFavoriteRequest', 'loading' ]),
    disabled: state.getIn([ 'components', 'targetDefiner', 'inspectorMode' ]) || props.loading,
    jiraConfig: state.getIn([ 'issues', 'list' ]).first(),
    issuesFetched: state.getIn([ 'issues', 'issuesFetched' ]),
    local: state.getIn(['sessions', 'timezone']),
    funnelRef: state.getIn(['funnels', 'navRef']),
    siteId: state.getIn([ 'user', 'siteId' ]),
    hasSessionsPath: hasSessioPath && !isAssist,
    metaList: state.getIn(['customFields', 'list']).map(i => i.key),
    closedLive: !!state.getIn([ 'sessions', 'errors' ]) || (isAssist && !session.live),
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

  getDimension = (width, height) => {
    return width && height ? (
      <div className="flex items-center">
        { width || 'x' } <Icon name="close" size="12" className="mx-1" /> { height || 'x' }
      </div>
    ) : <span className="">Resolution N/A</span>;
  }

  backHandler = () => {
    const { history, siteId, sessionPath } = this.props;
    const isLiveSession = sessionPath.includes("/assist");
    if (sessionPath === history.location.pathname || sessionPath.includes("/session/") || isLiveSession) {
      history.push(withSiteId(isLiveSession ? ASSIST_ROUTE: SESSIONS_ROUTE, siteId));
    } else {
      history.push(sessionPath ? sessionPath : withSiteId(SESSIONS_ROUTE, siteId));
    }
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
        userNumericHash,
        favorite,
        startedAt,
        userBrowser,
        userOs,
        userOsVersion,
        userDevice,
        userBrowserVersion,
        userDeviceType,
        live,
        metadata,
      },
      loading,
      // live,
      disabled,
      jiraConfig,
      fullscreen,
      hasSessionsPath,
      sessionPath,
      metaList,
      closedLive = false,
      siteId,
    } = this.props;
    const _live = live && !hasSessionsPath;

    const _metaList = Object.keys(metadata).filter(i => metaList.includes(i)).map(key => {
      const value = metadata[key];
      return { label: key, value };
    });

    return (
      <div className={ cn(stl.header, "flex justify-between", { "hidden" : fullscreen}) }>
        <div className="flex w-full items-center">
          <BackLink	onClick={this.backHandler} label="Back" />
          
          <div className={ stl.divider } />
          { _live && <AssistTabs userId={userId} userNumericHash={userNumericHash} />}

          <div className={cn("ml-auto flex items-center", { 'hidden' : closedLive })}>
            { live && hasSessionsPath && (
              <>
                <div className={stl.liveSwitchButton}>
                  <Link to={withSiteId(liveSessionRoute(sessionId), siteId)}>
                      This Session is Now Continuing Live
                  </Link>
                </div>
                <div className={ stl.divider } />
              </>
            )}
            
            { _live && (
              <>
                <SessionMetaList className="" metaList={_metaList} maxLength={3} />
                <div className={ stl.divider } />
              </>
            )}
            
            <Popup
                trigger={(
                  <IconButton icon="info-circle" primaryText label="More Info" disabled={disabled} />
                )}
                content={(
                  <div className=''>
                    <SessionInfoItem comp={<CountryFlag country={ userCountry } />} label={countries[userCountry]} value={ formatTimeOrDate(startedAt) } />
                    <SessionInfoItem icon={browserIcon(userBrowser)} label={userBrowser} value={ `v${ userBrowserVersion }` } />
                    <SessionInfoItem icon={osIcon(userOs)} label={userOs} value={ userOsVersion } />
                    <SessionInfoItem icon={deviceTypeIcon(userDeviceType)} label={userDeviceType} value={ this.getDimension(width, height) } isLast />
                  </div>
                )}
                on="click"
                position="top center"
                hideOnScroll
            />
            <div className={ stl.divider } />
            { _live && <AssistActions isLive userId={userId} /> }
            { !_live && (
              <>
                <Autoplay />
                <div className={ stl.divider } />
                <IconButton
                  // className="mr-2"
                  tooltip="Bookmark"
                  tooltipPosition="top right"
                  onClick={ this.toggleFavorite }
                  loading={ loading }
                  icon={ favorite ? 'star-solid' : 'star' }                  
                  plain
                />
                <div className={ stl.divider } />
                <SharePopup
                  entity="sessions"
                  id={ sessionId }
                  showCopyLink={true}
                  trigger={
                    <IconButton
                      // className="mr-2"
                      tooltip="Share Session"
                      tooltipPosition="top right"
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

