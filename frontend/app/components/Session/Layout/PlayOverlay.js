import React from 'react';
import cn from 'classnames';
import { useCallback, useState } from 'react';
import { Icon } from 'UI';
import cls from './PlayOverlay.module.css';

export default function PlayOverlay({ player }) {
	const [ iconVisible, setIconVisible ] = useState(false);

	const togglePlay = useCallback(() => {
		player.togglePlay();
		setIconVisible(true);
		setTimeout(() => setIconVisible(false), 800);
	});

	return (
		<div 
			className="absolute inset-0 flex items-center justify-center"
			onClick={ togglePlay }
		>
			<div className={ cn("flex items-center justify-center", cls.iconWrapper, { [ cls.zoomWrapper ]: iconVisible }) } >
				<Icon name={ player.state.playing ? "play" : "pause"} size="30" color="gray-medium"/>
			</div>
		</div>
	);
}
