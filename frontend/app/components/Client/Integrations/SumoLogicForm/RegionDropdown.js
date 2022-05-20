import React from 'react';
import { regionLabels as labels } from 'Types/integrations/sumoLogicConfig';
import Select from 'Shared/Select';

const options = Object.keys(labels).map(key => ({ text: labels[ key ], label: key }));

const RegionDropdown = props => (
	<Select 
		{ ...props }
		onChange={(e) => props.onChange(e)}
		selection
		options={ options.find(option => option.value === props.value) }
	/>
);

RegionDropdown.displayName = "RegionDropdown";

export default RegionDropdown;

