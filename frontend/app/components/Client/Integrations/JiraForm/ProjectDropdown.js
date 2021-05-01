import { connect } from 'react-redux';
import { edit } from 'Duck/integrations/actions';
import { Dropdown } from 'UI';
import { withRequest } from 'HOCs';

@connect(state => ({
	config: state.getIn([ 'issues', 'list' ])
}), { edit })
@withRequest({
	dataName: "values",
	initialData: [],
	resetBeforeRequest: true,
	requestName: "fetchProjects",
	endpoint: '/integrations/issues/list_projects',
	method: 'GET',
})
export default class ProductDropdown extends React.PureComponent {
	constructor(props) {
		super(props);
		this.fetchProjects()
	}
	fetchProjects() {
		const { config } = this.props;
    if (!config.validateFetchProjects()) return;
    
		this.props.fetchProjects().then(() => {
			const { value, values, name } = this.props;
			if (values && !values.includes(value) && values.length > 0) {
				this.props.edit("jira", {
					[ name ]: values[0].id,
				});
			}
		});
	}
	componentDidUpdate(prevProps) {
		const { config } = this.props;
		if ((prevProps.config.url !== config.url || prevProps.config.apiToken !== config.apiToken) && config.validateFetchProjects()) {
			this.fetchProjects();
		}
	}
	onChange = (e, target) => {
		if (typeof this.props.onChange === 'function') {
			this.props.onChange({ target });
		}
	}
	render() {
		const { 
			values,
			name,
			value,
			placeholder,
			loading,
		} = this.props;
		const options = values ? values.map(g => ({ text: g.name, value: g.id })) : []
		return (
			<Dropdown 
				selection
				options={ options }
				name={ name }
				value={ value }
				placeholder={ placeholder }
				onChange={ this.onChange }
				loading={ loading }
			/>
		);
	}
}