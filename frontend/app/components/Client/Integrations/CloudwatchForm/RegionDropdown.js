import React from 'react';
import { regionLabels as labels } from 'Types/integrations/cloudwatchConfig';
import Select from 'Shared/Select';

const options = Object.keys(labels).map(key => ({ text: labels[ key ], label: key }));

const RegionDropdown = props => (
	<Select 
		{ ...props }
		onChange={({ value }) => props.onChange({value})}
		selection
		value={ options.find(option => option.value === props.value) }
		options={ options }
	/>
);

RegionDropdown.displayName = "RegionDropdown";

export default RegionDropdown;

