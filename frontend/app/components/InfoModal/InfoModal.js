import { connect } from 'react-redux';
import { Modal } from 'UI';

@connect(state => ({
	open: false,
}))
export default class InfoModal extends React.PureComponent {
	render() {
		return (
			<Modal
				open={ this.props.open }
				size="small"
			>
				<Modal.Content>
				</Modal.Content>
			</Modal>
		);
	}
}