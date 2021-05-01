import { Checkbox } from 'semantic-ui-react';

export default ({ className="", ...props }) => (
	<Checkbox 
		{ ...props } 
		toggle 
		className={ `customCheckbox ${ className }` }
	/>
);