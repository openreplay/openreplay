import { Checkbox } from 'semantic-ui-react';

export default ({ className = '', ...props }) => (
  <Checkbox 
    className={`${ className } customCheckbox`} 
    { ...props }
  />
);