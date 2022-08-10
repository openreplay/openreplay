import React from 'react';
import { connect } from 'react-redux';
import { tokenRE } from 'Types/integrations/bugsnagConfig';
import { edit } from 'Duck/integrations/actions';
import Select from 'Shared/Select';
import { withRequest } from 'HOCs';

@connect(state => ({
	token: state.getIn([ 'bugsnag', 'instance', 'authorizationToken' ])
}), { edit })
@withRequest({
	dataName: "projects",
	initialData: [],
	dataWrapper: (data = [], prevData) => {
		if (!Array.isArray(data)) throw new Error('Wrong responce format.');
		const withOrgName = data.length > 1;
		return data.reduce((accum, { name: orgName, projects }) => {
			if (!Array.isArray(projects)) throw new Error('Wrong responce format.');
			if (withOrgName) projects = projects.map(p => ({ ...p, name: `${ p.name } (${ orgName })` }))
			return accum.concat(projects);
		}, []);
	},
	resetBeforeRequest: true,
	requestName: "fetchProjectList",
	endpoint: '/integrations/bugsnag/list_projects',
	method: 'POST',
})
export default class ProjectListDropdown extends React.PureComponent {
	constructor(props) {
		super(props);
		this.fetchProjectList()
	}
	fetchProjectList() {
		const { token } = this.props;
		if (!tokenRE.test(token)) return;
		this.props.fetchProjectList({
			authorizationToken: token,
		}).then(() => {
			const { value, projects } = this.props;
			const values = projects.map(p => p.id);
			if (!values.includes(value) && values.length > 0) {
				this.props.edit("bugsnag", {
					projectId: values[0],
				});
			}
		});
	}
	componentDidUpdate(prevProps) {
		if (prevProps.token !== this.props.token) {
			this.fetchProjectList();
		}
	}
	onChange = (target) => {
		if (typeof this.props.onChange === 'function') {
			this.props.onChange({ target });
		}
	}
	render() {
		const { 
			projects,
			name,
			value,
			placeholder,
			loading,
		} = this.props;
		const options = projects.map(({ name, id }) => ({ text: name, value: id }));
		return (
			<Select
				// selection
				options={ options }
				name={ name }
				value={ options.find(o => o.value === value) }
				placeholder={ placeholder }
				onChange={ this.onChange }
				loading={ loading }
			/>
		);
	}
}