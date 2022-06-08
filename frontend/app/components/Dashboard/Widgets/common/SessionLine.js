import cn from 'classnames';
import { session as sessionRoute } from 'App/routes';
import { Link, Icon, TextEllipsis } from 'UI';
import stl from './sessionLine.module.css';

const FeedbackLine = ({
	icon,
	info,
	subInfo,
	sessionId,
}) => {

	return (
		<div className={ cn(stl.wrapper, "relative flex items-center") }>
			{ icon && <Icon name={ icon } size="20" /> }
			<div className={ cn("ml-15", stl.ellipsisWrapper) }>
			  { info && 
			  	<TextEllipsis className={ stl.info }>
			    	{ info }
			  	</TextEllipsis>
			  }
			  { subInfo &&
			  	<div className={ stl.subInfo }>
			  		{ subInfo }
			  	</div>
			  }
			 </div>
		  <Link to={ sessionRoute(sessionId) } className={ stl.link } >
		  	<Icon name="external-link-alt" size="20" color="gray-light" />
		  </Link>
		</div>
	);
}

FeedbackLine.displayName = 'FeedbackLine';

export default FeedbackLine;