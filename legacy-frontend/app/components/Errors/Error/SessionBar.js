import React from 'react';
import cn from 'classnames';
import { capitalize } from 'App/utils';
import { session as sessionRoute } from 'App/routes';
import { Icon, Avatar, Link } from 'UI';
import { deviceTypeIcon, osIcon, browserIcon } from 'App/iconNames';
import IconCard from './IconCard';
import stl from './sessionBar.module.css';

function SessionBar({ 
	className,
	session: {
		sessionId, 
		viewed=false,
		userBrowser,
		userBrowserVersion,
		userOs,
		userOsVersion,
		userDeviceType,
		userDevice,
		userDisplayName,
		userNumericHash,
	}
}) {
	return (
		<Link 
			to={ sessionRoute(sessionId) } 
			className={ cn(
				className, 
				"block border-radius-3 thin-blue-border flex justify-between items-center p-4",
				stl.wrapper
			)}
		>
			<IconCard				
				avatarIcon={ <Avatar seed={ userNumericHash } /> }
				title={ userDisplayName }
			/>
			<IconCard 
				icon={ browserIcon(userBrowser) }
				title={ userBrowser }
				text={ userBrowserVersion }
			/>
			<IconCard 
				icon={ osIcon(userOs) }
				title={ userOs }
				text={ userOsVersion }
			/>
			<IconCard 
				icon={ deviceTypeIcon(userDeviceType) }
				title={ capitalize(userDeviceType) }
				text={ userDevice }
			/>
			
			<Icon
				name={ viewed ? 'play-fill' : 'play-circle-light' }
				size="30"
				color="teal"
			/>
		</Link>
	); 
}
SessionBar.displayName = "SessionBar";
export default SessionBar;