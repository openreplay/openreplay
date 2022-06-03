import React from 'react';
import { useState, useEffect } from 'react';
import ImagePlayer from 'Player/ios/ImagePlayer';
import { CRASHES, NETWORK, LOGS, PERFORMANCE, CUSTOM } from 'Player/ios/state';
import Network from './IOSPlayer/Network';
import Logs from './IOSPlayer/Logs';
import IMGScreen from './IOSPlayer/IMGScreen';
import Crashes from './IOSPlayer/Crashes';
import Performance from './IOSPlayer/Performance';
import StackEvents from './IOSPlayer/StackEvents';
import Layout from './Layout/Layout';

const TOOLBAR = [
	{
		Component: Network,
		key: NETWORK,
		label: "Network",
		icon: "wifi",
	},
	{
		Component: Logs,
		key: LOGS,
		label: "Logs",
		icon: "console",
	},
	{
		Component: Crashes,
		key: CRASHES,
		label: "Crashes",
		icon: "console/error",
	},
	{
		Component: StackEvents,
		key: CUSTOM,
		label: "Events",
		icon: "puzzle-piece",
	},
	{
		Component: Performance,
		key: PERFORMANCE,
		label: "Performance",
		icon: "tachometer-slow",
		showCount: false,
	}
];


export default function IOSPlayer({ session }) {
	const [player] = useState(() => new ImagePlayer(session));
	useEffect(() => {
		player.attach({ wrapperId: "IOSWrapper", screenId: "IOSscreen" });
		return () => {
			player.clean();
		}
	}, [])

	return (
		<Layout player={ player } toolbar={TOOLBAR} >
			<IMGScreen 
				screenId="IOSscreen"
				wrapperId="IOSWrapper"
				device={ session.userDevice }
				player={ player }
			/>
		</Layout>
	);
}