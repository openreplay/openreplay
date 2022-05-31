import React from 'react';
import styles from './message.module.css';
import { Icon } from 'UI';

const Message = ({ hidden = false, visible = false, children, inline=false, success=false, info=true, text }) => (visible || !hidden) ? (
	<div className={ styles.message } data-inline={ inline }>
		<Icon name="check" color='green' />
		{ text 
			? text
			: children 
		}
	</div>) : null;

Message.displayName = "Message";

export default Message;