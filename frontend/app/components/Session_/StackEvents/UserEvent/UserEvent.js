import cn from 'classnames';
import { OPENREPLAY, SENTRY, DATADOG, STACKDRIVER } from 'Types/session/stackEvent'; 
import { Modal, Icon, SlideModal } from 'UI';
import withToggle from 'HOCs/withToggle';
import Sentry from './Sentry';
import JsonViewer from './JsonViewer';
import stl from './userEvent.css';

// const modalSources = [ SENTRY, DATADOG ];

@withToggle()  //
export default class UserEvent extends React.PureComponent {
	getIconProps() {
		const { source } = this.props.userEvent;
		return {
			name: `integrations/${ source }`,
			size: 18,
			marginRight: source === OPENREPLAY ? 11 : 10
		}
	}

	getLevelClassname() {
		const { userEvent } = this.props;
		if (userEvent.isRed()) return "error color-red";
		return '';
	}

	// getEventMessage() {
	// 	const { userEvent } = this.props;
	// 	switch(userEvent.source) {
	// 		case SENTRY:
	// 		case DATADOG:
	// 			return null;
	// 		default:
	// 			return JSON.stringify(userEvent.data);
	// 	}
	// }

	renderPopupContent() {
		const { userEvent: { source, payload, name} } = this.props;
		switch(source) {
			case SENTRY:
				return <Sentry event={ payload } />;
			case DATADOG:
				return <JsonViewer title={ name } data={ payload } icon="integrations/datadog" />;
			case STACKDRIVER:
				return <JsonViewer title={ name } data={ payload } icon="integrations/stackdriver" />;
			default:
				return <JsonViewer title={ name } data={ payload } icon={ `integrations/${ source }` } />;
		}
	}

	ifNeedModal() {
		return !!this.props.userEvent.payload;
	}

	renderContent(modalTrigger) {
		const { userEvent } = this.props;
		//const message = this.getEventMessage();
		return (
			<div
				data-scroll-item={ userEvent.isRed() }
				onClick={ this.props.switchOpen } //
		    className={ 
		    	cn(
			    	stl.userEvent,
			    	this.getLevelClassname(),
			    	{ [ stl.modalTrigger ]: modalTrigger }
			    )
		  	} 
		  >
		    <div className={ stl.infoWrapper }>
		      <div 
		      	className={ stl.title }
		      >
		      	<Icon { ...this.getIconProps() } />
	        	{ userEvent.name }
		      </div>
		      { /* message && 
		      	<div className={ stl.message }>
			      	{ message }
			      </div> */
			    }
		    </div>
		  </div>
		); 
	}

	render() {
		const { userEvent } = this.props;
		if (this.ifNeedModal()) {
			return (
				<React.Fragment>
				<SlideModal
          //title="Add Custom Field"
          size="middle"
          isDisplayed={ this.props.open }
          content={ this.props.open && this.renderPopupContent() }
          onClose={ this.props.switchOpen }
        />
        { this.renderContent(true) }
        </React.Fragment>
				//<Modal 
				//	trigger={ this.renderContent(true) }
				//	content={ this.renderPopupContent() }
				//	centered={ false }
				// 	size="small"
				// />
			);
		}
	  return this.renderContent();
	}
}
