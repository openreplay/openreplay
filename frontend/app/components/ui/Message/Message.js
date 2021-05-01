import styles from './message.css';

const Message = ({ children, inline=false, success=false, info=true, text }) => (
	<div className={ styles.message } data-inline={ inline }>
		<Icon name="check" color='green' />
		{ text 
			? text
			: children 
		}
	</div>
);

Message.displayName = "Message";

export default Message;