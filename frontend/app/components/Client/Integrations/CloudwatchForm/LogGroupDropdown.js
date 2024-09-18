import React, { useState, useEffect, useCallback } from 'react';
import { ACCESS_KEY_ID_LENGTH, SECRET_ACCESS_KEY_LENGTH } from 'Types/integrations/cloudwatchConfig';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import Select from 'Shared/Select';
import { integrationsService } from "App/services";

const LogGroupDropdown = (props) => {
	const { integrationsStore } = useStore();
	const config = integrationsStore.cloudwatch.instance;
	const edit = integrationsStore.cloudwatch.edit;
	const {
		value,
		name,
		placeholder,
		onChange,
	} = props;

	const [values, setValues] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(false);

	const { region, awsSecretAccessKey, awsAccessKeyId } = config;

	const fetchLogGroups = useCallback(() => {
		if (
			region === '' ||
			awsSecretAccessKey.length !== SECRET_ACCESS_KEY_LENGTH ||
			awsAccessKeyId.length !== ACCESS_KEY_ID_LENGTH
		) {
			return;
		}

		setLoading(true);
		setError(false);
		setValues([]); // Reset values before request

		const params = {
			region: region,
			awsSecretAccessKey: awsSecretAccessKey,
			awsAccessKeyId: awsAccessKeyId,
		};

		integrationsService.client
			.post('/integrations/cloudwatch/list_groups', params)
			.then((response) => response.json())
			.then(({ errors, data }) => {
				if (errors) {
					setError(true);
					setLoading(false);
					return;
				}
				setValues(data);
				setLoading(false);

				// If current value is not in the new values list, update it
				if (!data.includes(value) && data.length > 0) {
					edit({
						[name]: data[0],
					});
				}
			})
			.catch(() => {
				setError(true);
				setLoading(false);
			});
	}, [region, awsSecretAccessKey, awsAccessKeyId, value, name, edit]);

	// Fetch log groups on mount and when config changes
	useEffect(() => {
		fetchLogGroups();
	}, [fetchLogGroups]);

	const handleChange = (target) => {
		if (typeof onChange === 'function') {
			onChange({ target });
		}
	};

	const options = values.map((g) => ({ text: g, value: g }));
	return (
		<Select
			options={options}
			name={name}
			value={options.find((o) => o.value === value)}
			placeholder={placeholder}
			onChange={handleChange}
			loading={loading}
		/>
	);
};

export default observer(LogGroupDropdown);
