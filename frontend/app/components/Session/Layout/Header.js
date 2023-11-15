import React from 'react';
import cn from 'classnames';
import { useEffect } from 'react';
import { connect } from 'react-redux';
import { browserIcon, osIcon, deviceTypeIcon } from 'App/iconNames';
import { formatTimeOrDate } from 'App/date';
import { sessions as sessionsRoute } from 'App/routes';
import { CountryFlag, IconButton, BackLink } from 'UI';
import { toggleFavorite } from 'Duck/sessions';
import { fetchList as fetchListIntegration } from 'Duck/integrations/actions';
import SharePopup from 'Shared/SharePopup/SharePopup';
import { capitalize } from "App/utils";

import Section from './Header/Section';
import Resolution from './Header/Resolution';
import Issues from 'Components/Session_/Issues/Issues'; //TODO replace folder
import cls from './header.module.css';


const SESSIONS_ROUTE = sessionsRoute();


function Header({ 
  player,
	session,
	loading,
	isLocalUTC,
	toggleFavorite,
	favoriteLoading,
	fetchListIntegration,
	enableIssues,
}) {
	useEffect(() => {
		fetchListIntegration('issues');
	}, []);

	return (
	  <div className={ cn(cls.header, "flex") }>
      <BackLink	to={ SESSIONS_ROUTE } label="Back" />
      
      <div className={ cls.divider } />
      
      <div className="mx-4 flex items-center">
        <CountryFlag country={ session.userCountry } />
        <div className="ml-2 font-normal color-gray-dark mt-1 text-sm">
          { formatTimeOrDate(session.startedAt) } <span>{ isLocalUTC ? 'UTC' : ''}</span>
        </div>
      </div>

      { !session.isIOS && 
      	<Section icon={ browserIcon(session.userBrowser) } label={ `v${ session.userBrowserVersion }` } />
      }
      <Section icon={ deviceTypeIcon(session.userDeviceType) } label={ capitalise(session.userDevice) } />
      { !session.isIOS && 
        <Section icon="expand-wide" label={ <Resolution player={player} /> } />
      }
      <Section icon={ osIcon(session.userOs) } label={ session.isIOS ? session.userOsVersion : session.userOs } />

      <div className='ml-auto flex items-center'>
        <IconButton
          className="mr-2"
          tooltip="Bookmark"
          onClick={ toggleFavorite }
          loading={ favoriteLoading }
          icon={ session.favorite ? 'star-solid' : 'star' }
          plain
        />
        <SharePopup
          entity="sessions"
          id={ session.sessionId }
          trigger={
            <IconButton
              className="mr-2"
              tooltip="Share Session"
              disabled={ loading }
              icon={ 'share-alt' }
              plain
            />
          }
        />
        { enableIssues &&  <Issues sessionId={ sessionId } /> }
      </div>
    </div>
	);
}


export default connect((state, props) => ({
  session: state.getIn([ 'sessions', 'current' ]),
  favoriteLoading: state.getIn([ 'sessions', 'toggleFavoriteRequest', 'loading' ]),
  loading: state.getIn([ 'sessions', 'loading' ]),
  enableIssues: !!state.getIn([ 'issues', 'list', 'token' ]), //??
  isLocalUTC: state.getIn(['sessions', 'timezone']) === 'UTC',
}), {
  toggleFavorite, fetchListIntegration
})(Header)