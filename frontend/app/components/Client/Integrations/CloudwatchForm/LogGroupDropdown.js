import React from 'react';
import { connect } from 'react-redux';
import { ACCESS_KEY_ID_LENGTH, SECRET_ACCESS_KEY_LENGTH } from 'Types/integrations/cloudwatchConfig';
import { edit } from 'Duck/integrations/actions';
import Select from 'Shared/Select';
import { withRequest } from 'HOCs';

@connect(state => ({
	config: state.getIn([ 'cloudwatch', 'instance' ])
}), { edit })
@withRequest({
	dataName: "values",
	initialData: [],
	resetBeforeRequest: true,
	requestName: "fetchLogGroups",
	endpoint: '/integrations/cloudwatch/list_groups',
	method: 'POST',
})
export default class LogGroupDropdown extends React.PureComponent {
	constructor(props) {
		super(props);
		this.fetchLogGroups()
	}
	fetchLogGroups() {
		const { config } = this.props;
		if (config.region === "" ||
			config.awsSecretAccessKey.length !== SECRET_ACCESS_KEY_LENGTH ||
			config.awsAccessKeyId.length !== ACCESS_KEY_ID_LENGTH
		) return;
		this.props.fetchLogGroups({
			region: config.region,
			awsSecretAccessKey: config.awsSecretAccessKey,
			awsAccessKeyId: config.awsAccessKeyId,
		}).then(() => {
			const { value, values, name } = this.props;
			if (!values.includes(value) && values.length > 0) {
				this.props.edit("cloudwatch", {
					[ name ]: values[0],
				});
			}
		});
	}
	componentDidUpdate(prevProps) {
		const { config } = this.props;
		if (prevProps.config.region !== config.region ||
			prevProps.config.awsSecretAccessKey !== config.awsSecretAccessKey ||
			prevProps.config.awsAccessKeyId !== config.awsAccessKeyId) {
			this.fetchLogGroups();
		}
	}
	onChange = (target) => {
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
		const options = values.map(g => ({ text: g, value: g }));
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