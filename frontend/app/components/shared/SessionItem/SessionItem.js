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
import SessionMetaList from './SessionMetaList';
import ErrorBars from './ErrorBars';

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
      onUserClick = () => null,
      hasUserFilter = false,
      disableUser = false
    } = this.props;
    const formattedDuration = durationFormatted(duration);
    const hasUserId = userId || userAnonymousId;

    return (
      <div className={ cn(stl.sessionItem, "flex flex-col bg-white p-3 mb-3") } id="session-item" >
        <div className="flex items-start">
          <div className={ cn('flex items-center w-full')}>
            <div className="flex items-center" style={{ width: "40%"}}>
              <div><Avatar seed={ userNumericHash } /></div>
              <div className="flex flex-col overflow-hidden color-gray-medium ml-3">
                <div
                  className={cn({'color-teal cursor-pointer': !disableUser && hasUserId, 'color-gray-medium' : disableUser || !hasUserId})}
                  onClick={() => (!disableUser && !hasUserFilter && hasUserId) && onUserClick(userId, userAnonymousId)}
                >
                  {userDisplayName}
                </div>
                <div className="color-gray-medium">30 Sessions</div>
              </div>
            </div>
            <div style={{ width: "20%"}}>
              <div>{formatTimeOrDate(startedAt, timezone) }</div>
              <div className="flex items-center color-gray-medium">
                {!live && (
                    <div className="color-gray-medium">
                      <span className="mr-1">{ eventsCount }</span>
                      <span>{ eventsCount === 0 || eventsCount > 1 ? 'Events' : 'Event' }</span>
                    </div>
                )}
                <span className="mx-1">-</span>
                <div>{ live ? <Counter startTime={startedAt} /> : formattedDuration }</div>
              </div>
            </div>
            <div style={{ width: "20%"}}>
              <div className="">
                <CountryFlag country={ userCountry } className="mr-6" />
                <div className="color-gray-medium">
                  <span>{userBrowser}</span> -
                  <span>{userOs}</span> -
                  <span>{userDeviceType}</span>
                </div>
              </div>
            </div>
            <div style={{ width: "10%"}} className="self-center">
              <ErrorBars count={errorsCount} />
            </div>
          </div>

          <div className="flex items-center">
            {/* { live && <LiveTag isLive={true} /> } */}
            <div className={ cn(stl.iconDetails, stl.favorite, 'px-4') } data-favourite={favorite} >
              <Bookmark sessionId={sessionId} favorite={favorite} />
            </div>
            
            <div className={ stl.playLink } id="play-button" data-viewed={ viewed }>
              <Link to={ sessionRoute(sessionId) }>
                <Icon name={ viewed ? 'play-fill' : 'play-circle-light' } size="30" color="teal" />
              </Link>
            </div>
          </div>
        </div>
        <SessionMetaList className="pt-3" metaList={[
          { label: 'Pages', value: pagesCount },
          { label: 'Errors', value: errorsCount },
          { label: 'Events', value: eventsCount },
          { label: 'Events', value: eventsCount },
          { label: 'Events', value: eventsCount },
        ]} />
      </div>
    );
  }
}