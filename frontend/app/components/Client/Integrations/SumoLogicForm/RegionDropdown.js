import { regionLabels as labels } from 'Types/integrations/sumoLogicConfig';
import { Dropdown } from 'UI';

const options = Object.keys(labels).map(key => ({ text: labels[ key ], value: key }));

const RegionDropdown = props => (
	<Dropdown 
		{ ...props }
		onChange={(e, target) => props.onChange({target})}
		selection
		options={ options }
	/>
);

RegionDropdown.displayName = "RegionDropdown";

export default RegionDropdown;

