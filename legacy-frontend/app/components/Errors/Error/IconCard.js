import React from 'react';
import cn from 'classnames';
import { Icon } from 'UI';

function IconCard({ className, title, text, icon, avatarIcon }) {
	return (
		<div className={ cn(className, "flex items-center") }>
			{ avatarIcon && avatarIcon}
			{ !avatarIcon && <Icon name={ icon } size={27} /> }
			<div className="ml-2 leading-none">
				<h6> { title } </h6>
				<span className="font-thin text-sm"> { text }</span>
			</div>
		</div>
	);
}

IconCard.displayName = "IconCard";

export default IconCard;