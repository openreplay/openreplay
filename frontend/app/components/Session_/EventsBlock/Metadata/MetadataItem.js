import React from 'react';
import { List } from 'immutable';
import cn from 'classnames';
import { withRequest, withToggle } from 'HOCs';
import { Button, Icon, SlideModal, TextEllipsis } from 'UI';
import stl from './metadataItem.module.css';
import SessionList from './SessionList';

@withToggle()
@withRequest({
	initialData: List(),
	endpoint: '/metadata/session_search',
	dataWrapper: data => Object.values(data),
	dataName: 'similarSessions',
})
export default class extends React.PureComponent {
	state = {
		requested: false,
	}
	switchOpen = () => {
		const { 
			item: {
				key, value
			},
			request,
			switchOpen,
		} = this.props;

		const { requested } = this.state;
		if (!requested) {
			this.setState({ requested: true });
			request({ key, value });
		}
		switchOpen();
	}

	render() {
		const { 
			item,
			similarSessions,
			open,
			loading,
		} = this.props;

		return (
			<div>
				<SlideModal
          title={ <div className={ stl.searchResultsHeader }>{ `All Sessions Matching - ` } <span>{ item.key  + ' - ' + item.value }</span> </div> }
          isDisplayed={ open }
					content={ open && <SessionList similarSessions={ similarSessions } loading={ loading } /> }
          onClose={ open ? this.switchOpen : () => null }
        />
				<div className={ cn("flex justify-between items-center p-3 capitalize", stl.field) } >
	        <div>
						<div className={ stl.key }>{ item.key }</div>
						<TextEllipsis
							maxWidth="210px" 
							popupProps={ { disabled: item.value && item.value.length < 30 } }
						>
							{ item.value }
						</TextEllipsis>
					</div>
	        <Button
            	onClick={ this.switchOpen }
				variant="text"
				className={ stl.searchButton }
				id="metadata-item"
			>
				<Icon name="search" size="16" color="teal" />
			</Button>
	      </div>
	     </div>
		);
	}
}