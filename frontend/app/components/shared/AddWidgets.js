import { connect } from 'react-redux';
import cn from 'classnames';
import withToggle from 'HOCs/withToggle';
import { IconButton, Popup } from 'UI';
import { updateAppearance } from 'Duck/user';
import stl from './addWidgets.css';
import OutsideClickDetectingDiv from 'Shared/OutsideClickDetectingDiv';
import { updateActiveState } from 'Duck/customMetrics';

const CUSTOM_METRICS = 'custom_metrics';

@connect(state => ({
	appearance: state.getIn([ 'user', 'account', 'appearance' ]),
	customMetrics: state.getIn(['customMetrics', 'list']),
}), {
  updateAppearance, updateActiveState,
})
@withToggle()
export default class AddWidgets extends React.PureComponent {
	makeAddHandler = widgetKey => () => {
		if (this.props.type === CUSTOM_METRICS) {
			this.props.updateActiveState(widgetKey, true);
		} else {
			const { appearance } = this.props;
			const newAppearance = appearance.setIn([ 'dashboard', widgetKey ], true);
			this.props.updateAppearance(newAppearance)
		}

		this.props.switchOpen(false);
	}

	getCustomMetricWidgets = () => {
		return this.props.customMetrics.filter(i => !i.active).map(item => ({
			type: CUSTOM_METRICS,
			key: item.metricId,
			name: item.name,
		})).toJS();
	}

	render() {
		const { disabled, widgets, type  } = this.props;
		const filteredWidgets = type === CUSTOM_METRICS ? this.getCustomMetricWidgets() : widgets;

		return (
			<div className="relative">
				<Popup
					trigger={
						<IconButton 
							circle
							size="small"
							icon="plus" 
							outline 
							onClick={ this.props.switchOpen } 
							disabled={ filteredWidgets.length === 0 }
						/>
					}
					content={ `Add a metric to this section.` }
					size="tiny"
					inverted
					position="top center"
				/>
				<OutsideClickDetectingDiv onClickOutside={() => this.props.switchOpen(false)}>
					{this.props.open && 
						<div
							className={cn(stl.menuWrapper, 'absolute border rounded z-10 bg-white w-auto')}
							style={{ minWidth: '200px', top: '30px'}}
						>
							{filteredWidgets.map(w => (
								<div
									key={w.key}
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