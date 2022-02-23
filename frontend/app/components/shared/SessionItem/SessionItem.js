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
import { session as sessionRoute, liveSession as liveSessionRoute, withSiteId } from 'App/routes';
import { durationFormatted, formatTimeOrDate } from 'App/date';
import stl from './sessionItem.css';
import LiveTag from 'Shared/LiveTag';
import Bookmark from 'Shared/Bookmark';
import Counter from './Counter'
import { withRouter } from 'react-router-dom';
import SessionMetaList from './SessionMetaList';
import ErrorBars from './ErrorBars';
import { assist as assistRoute, isRoute } from "App/routes";
import { capitalize } from 'App/utils';

const ASSIST_ROUTE = assistRoute();

const Label = ({ label = '', color = 'color-gray-medium'}) => (
  <div className={ cn('font-light text-sm', color)}>{label}</div>
)
@connect(state => ({
  timezone: state.getIn(['sessions', 'timezone']),
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
        live,
        metadata,
        userSessionsCount,
        issueTypes,
      },
      timezone,
      onUserClick = () => null,
      hasUserFilter = false,
      disableUser = false,
      metaList = [],
    } = this.props;
    const formattedDuration = durationFormatted(duration);
    const hasUserId = userId || userAnonymousId;
    const isAssist = isRoute(ASSIST_ROUTE, this.props.location.pathname);

    const _metaList = Object.keys(metadata).filter(i => metaList.includes(i)).map(key => {
      const value = metadata[key];
      return { label: key, value };
    });

    return (
      <div className={ cn(stl.sessionItem, "flex flex-col bg-white p-3 mb-3") } id="session-item" >
        <div className="flex items-start">
          <div className={ cn('flex items-center w-full')}>
            <div className="flex items-center pr-2" style={{ width: "30%"}}>
              <div><Avatar seed={ userNumericHash } isAssist={isAssist} /></div>
              {/* <div className="flex flex-col overflow-hidden color-gray-medium ml-3"> */}
              <div className="flex flex-col overflow-hidden color-gray-medium ml-3 justify-between items-center">
                <div
                  className={cn('text-lg', {'color-teal cursor-pointer': !disableUser && hasUserId, 'color-gray-medium' : disableUser || !hasUserId})}
                  onClick={() => (!disableUser && !hasUserFilter) && onUserClick(userId, userAnonymousId)}
                >
                  {userDisplayName}
                </div>
                {/* <div
                  className="color-gray-medium text-dotted-underline cursor-pointer"
                  onClick={() => (!disableUser && !hasUserFilter) && onUserClick(userId, userAnonymousId)}
                >
                  {userSessionsCount} Sessions
                </div> */}
              </div>
            </div>
            <div style={{ width: "20%", height: "38px" }} className="px-2 flex flex-col justify-between">
              <div>{formatTimeOrDate(startedAt, timezone) }</div>
              <div className="flex items-center color-gray-medium">
                {!isAssist && (
                    <>
                      <div className="color-gray-medium">
                        <span className="mr-1">{ eventsCount }</span>
                        <span>{ eventsCount === 0 || eventsCount > 1 ? 'Events' : 'Event' }</span>
                      </div>
                      <div className="mx-2 text-4xl">·</div>
                    </>
                )}
                <div>{ live ? <Counter startTime={startedAt} /> : formattedDuration }</div>
              </div>
            </div>
            <div style={{ width: "30%", height: "38px" }} className="px-2 flex flex-col justify-between">
              <CountryFlag country={ userCountry } className="mr-2" label />
              <div className="color-gray-medium flex items-center">
                <span className="capitalize" style={{ maxWidth: '70px'}}>
                  <TextEllipsis text={ capitalize(userBrowser) } popupProps={{ inverted: true, size: "tiny" }} />
                </span> 
                <div className="mx-2 text-4xl">·</div>
                <span className="capitalize" style={{ maxWidth: '70px'}}>
                  <TextEllipsis text={ capitalize(userOs) } popupProps={{ inverted: true, size: "tiny" }} />
                </span>
                <div className="mx-2 text-4xl">·</div>
                <span className="capitalize" style={{ maxWidth: '70px'}}>
                  <TextEllipsis text={ capitalize(userDeviceType) } popupProps={{ inverted: true, size: "tiny" }} />
                </span>
              </div>
            </div>
            { !isAssist && (
              <div style={{ width: "10%"}} className="self-center px-2 flex items-center">
                <ErrorBars count={issueTypes.length} />
              </div>
            )}
          </div>

          <div className="flex items-center">
            <div className={ stl.playLink } id="play-button" data-viewed={ viewed }>
              <Link to={ isAssist ? liveSessionRoute(sessionId) : sessionRoute(sessionId) }>
                <Icon name={ !viewed && !isAssist ? 'play-fill' : 'play-circle-light' } size="42" color={isAssist ? "tealx" : "teal"} />
              </Link>
            </div>
          </div>
        </div>
        { _metaList.length > 0 && (
          <SessionMetaList className="mt-4" metaList={_metaList} />
        )}
      </div>
    );
  }
}