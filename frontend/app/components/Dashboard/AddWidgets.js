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
		const { appearance } = this.props;
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
			</div>
		);
	}
}