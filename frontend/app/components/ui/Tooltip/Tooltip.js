import { Popup } from 'UI';

export default class Tooltip extends React.PureComponent {
	static defaultProps = {
		timeout: 500,
	}
	state = { 
		open: false,
	}
	mouseOver = false
	onMouseEnter = () => {
		this.mouseOver = true;
		setTimeout(() => {
			if (this.mouseOver) this.setState({ open: true });
		}, this.props.timeout)
	}
	onMouseLeave = () => {
		this.mouseOver = false;
		this.setState({
			open: false,
		});
	}

	render() {
		const { trigger, tooltip, position } = this.props;
		const { open } = this.state;
		return (
			<Popup
				open={ open }
				content={ tooltip }
				inverted
				disabled={ !tooltip }
				position={position}
				trigger={
					<span //TODO: no wrap component around
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