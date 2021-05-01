import { connect } from 'react-redux';
import cn from 'classnames';
import withToggle from 'HOCs/withToggle';
import { IconButton, SlideModal, NoContent } from 'UI';
import { updateAppearance } from 'Duck/user';
import { WIDGET_LIST } from 'Types/dashboard';
import stl from './addWidgets.css';
import OutsideClickDetectingDiv from 'Shared/OutsideClickDetectingDiv';

@connect(state => ({
	appearance: state.getIn([ 'user', 'account', 'appearance' ]),
}), {
  updateAppearance,
})
@withToggle()
export default class AddWidgets extends React.PureComponent {
	makeAddHandler = widgetKey => () => {
		const { appearance } = this.props;
		const newAppearance = appearance.setIn([ 'dashboard', widgetKey ], true);
		this.props.switchOpen(false);
		this.props.updateAppearance(newAppearance)		
	}

	render() {
		const { appearance, disabled } = this.props;
		const avaliableWidgets = WIDGET_LIST.filter(({ key, type }) => !appearance.dashboard[ key ] && type === this.props.type );

		return (
			<div className="relative">
				<OutsideClickDetectingDiv onClickOutside={() => this.props.switchOpen(false)}>
					{this.props.open && 
						<div
							className={cn(stl.menuWrapper, 'absolute border rounded z-10 bg-white w-auto')}
							style={{ minWidth: '200px', top: '30px'}}
						>
							{avaliableWidgets.map(w => (
								<div
									className={cn(stl.menuItem, 'whitespace-pre cursor-pointer')}
									onClick={this.makeAddHandler(w.key)}
								>
									{w.name}
								</div>
							))}
						</div>
					}
				</OutsideClickDetectingDiv>

				<SlideModal
	        title="Add Widget"
	        size="middle"	        
	        isDisplayed={ false }
	        content={ this.props.open &&
	        	<NoContent
	        	  title="No Widgets Left"
	        	  size="small"
	        	 	show={ avaliableWidgets.length === 0}
	        	>
	       	   	{ avaliableWidgets.map(({ key, name, description, thumb }) => (
		       			<div className={ cn(stl.widgetCard) } key={ key } >								       				
									<div className="flex justify-between items-center flex-1">
										<div className="mr-10">
											<h4>{ name }</h4>									
										</div>
										<IconButton
											className="flex-shrink-0"
											onClick={ this.makeAddHandler(key) }
											circle
											outline
											icon="plus"
											style={{ width: '24px', height: '24px'}}
										/>
									</div>
		       			</div>
		       		))}
		       	</NoContent>
	        }
	        onClose={ this.props.switchOpen }
	      />
				<IconButton 
					circle
					size="small"
					icon="plus" 
					outline 
					onClick={ this.props.switchOpen } 
					disabled={ disabled || avaliableWidgets.length === 0 } //TODO disabled after Custom fields filtering 
				/>
			</div>
		);
	}
}