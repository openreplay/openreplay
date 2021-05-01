import { Icon, JSONTree } from 'UI';

export default class JsonViewer extends React.PureComponent {
	render() {
		const { data, title, icon } = this.props;
		return (
			<div className="p-5">
				<Icon name={ icon } size="54" />
				<h4 className="my-5"> { title }</h4>
				<JSONTree src={ data } collapsed={ false } />
			</div>
		);
	}
}