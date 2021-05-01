import { Popup } from 'UI';

export default class Tooltip extends React.PureComponent {
	state = { 
		open: false,
	}
	mouseOver = false
	onMouseEnter = () => {
		this.mouseOver = true;
		setTimeout(() => {
			if (this.mouseOver) this.setState({ open: true });
		}, 1000)
	}
	onMouseLeave = () => {
		this.mouseOver = false;
		this.setState({
			open: false,
		});
	}

	render() {
		const { trigger, tooltip } = this.props;
		const { open } = this.state;
		return (
			<Popup
				open={ open }
				content={ tooltip }
				inverted
				trigger={
					<span 
						onMouseEnter={ this.onMouseEnter }
						onMouseLeave={ this.onMouseLeave }
					>
						{ trigger }
					</span>
				}
			/>
		);
	}
}