import { BrowserIcon, OsIcon, Icon, CountryFlag, Link } from 'UI';
import { deviceTypeIcon } from 'App/iconNames';
import { session as sessionRoute } from 'App/routes';
import { formatTimeOrDate } from 'App/date';


const SessionLine = ({ session: { 
		userBrowser,
    userOs,
    userCountry,
    siteId,
    sessionId,
    viewed,
    userDeviceType,
    startedAt
 } }) => (
	<div className="flex justify-between items-center" style={{ padding: '5px 20px' }}>
		<div className="color-gray-medium font-size-10" >
			<CountryFlag country={ userCountry } className="mr-4" />
			{ formatTimeOrDate(startedAt) }
		</div>
		<div className="flex">
			<BrowserIcon browser={ userBrowser } className="mr-4" />
	    <OsIcon os={ userOs } size="20" className="mr-4" />
	    <Icon name={ deviceTypeIcon(userDeviceType) } size="20" className="mr-4" />
	  </div>
    <Link to={ sessionRoute(sessionId) } siteId={ siteId } >
    	<Icon
        name={ viewed ? 'play-fill' : 'play-circle-light' }
        size="20"
        color="teal"
      />
		</Link>
	</div>
);


SessionLine.displayName = "SessionLine";

export default SessionLine;
