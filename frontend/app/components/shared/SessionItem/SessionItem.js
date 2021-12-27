import { connect } from 'react-redux';
import cn from 'classnames';
import { 
  Link,
  Icon,
  OsIcon,
  BrowserIcon,
  CountryFlag,
  Avatar,
  TextEllipsis
} from 'UI';
import { deviceTypeIcon } from 'App/iconNames';
import { toggleFavorite, setSessionPath } from 'Duck/sessions';
import { session as sessionRoute, withSiteId } from 'App/routes';
import { durationFormatted, formatTimeOrDate } from 'App/date';
import stl from './sessionItem.css';
import LiveTag from 'Shared/LiveTag';
import Bookmark from 'Shared/Bookmark';
import Counter from './Counter'
import { withRouter } from 'react-router-dom';

const Label = ({ label = '', color = 'color-gray-medium'}) => (
  <div className={ cn('font-light text-sm', color)}>{label}</div>
)
@connect(state => ({
  timezone: state.getIn(['sessions', 'timezone']),
  isAssist: state.getIn(['sessions', 'activeTab']).type === 'live',
  siteId: state.getIn([ 'user', 'siteId' ]),
}), { toggleFavorite, setSessionPath })
@withRouter
export default class SessionItem extends React.PureComponent {

  replaySession = () => {
    const { history, session: { sessionId }, siteId, isAssist } = this.props;
    if (!isAssist) {
      this.props.setSessionPath(history.location.pathname)
    }
    history.push(withSiteId(sessionRoute(sessionId), siteId))
  }
  // eslint-disable-next-line complexity
  render() {
    const {
      session: {
        sessionId,
        userBrowser,
        userOs,
        userId,
        userAnonymousId,
        userDisplayName,
        userCountry,
        startedAt,
        duration,
        eventsCount,
        errorsCount,
        pagesCount,
        viewed,
        favorite,
        userDeviceType,
        userUuid,
        userNumericHash,
        live        
      },
      timezone,
      onUserClick,
      hasUserFilter = false,
      disableUser = false
    } = this.props;
    const formattedDuration = durationFormatted(duration);
    const hasUserId = userId || userAnonymousId;

    return (
      <div className={ stl.sessionItem } id="session-item" >
        <div className={ cn('flex items-center mr-auto')}>
          <div className="flex items-center mr-6" style={{ width: '200px' }}>
            <Avatar seed={ userNumericHash } />
            <div className="flex flex-col ml-3 overflow-hidden">
              <div
                className={cn({'color-teal cursor-pointer': !disableUser && hasUserId, 'color-gray-medium' : disableUser || !hasUserId})}
                onClick={() => (!disableUser && !hasUserFilter && hasUserId) && onUserClick(userId, userAnonymousId)}
              >
                <TextEllipsis text={ userDisplayName } noHint />
              </div>
              <Label label={ formatTimeOrDate(startedAt, timezone) } />
            </div>
          </div>
          <div className={ cn(stl.iconStack, 'flex-1') }>
            <div className={ stl.icons }>
              <CountryFlag country={ userCountry } className="mr-6" />
              <BrowserIcon browser={ userBrowser } size="16" className="mr-6" />
              <OsIcon os={ userOs } size="16" className="mr-6" />
              <Icon name={ deviceTypeIcon(userDeviceType) } size="16" className="mr-6" />
            </div>
          </div>
          <div className="flex flex-col items-center px-4" style={{ width: '150px'}}>
            <div className="text-xl">
              { live ? <Counter startTime={startedAt} /> : formattedDuration }            
            </div>
            <Label label="Duration" />
          </div>

          {!live && (
            <div className="flex flex-col items-center px-4">
              <div className={ stl.count }>{ eventsCount }</div>
              <Label label={ eventsCount === 0 || eventsCount > 1 ? 'Events' : 'Event' } />
            </div>
          )}

        </div>

        <div className="flex items-center">
          {!live && (
            <div className="flex flex-col items-center px-4">
              <div className={ cn(stl.count, { "color-gray-medium": errorsCount === 0 }) } >{ errorsCount }</div>
              <Label label="Errors" color={errorsCount > 0 ? '' : 'color-gray-medium'} />
            </div>
          )}
          
          { live && <LiveTag isLive={true} /> }

          <div className={ cn(stl.iconDetails, stl.favorite, 'px-4') } data-favourite={favorite} >
            <Bookmark sessionId={sessionId} favorite={favorite} />
          </div>
          
          <div className={ stl.playLink } id="play-button" data-viewed={ viewed }>
            <div onClick={this.replaySession}>
              <Icon name={ viewed ? 'play-fill' : 'play-circle-light' } size="30" color="teal" />
            </div>
          </div>
        </div>
      </div>
    );
  }
}