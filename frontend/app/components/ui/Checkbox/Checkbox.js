import React from 'react';
// import { Checkbox } from 'semantic-ui-react';

export default ({ className = '', ...props }) => (
  <input
    type="checkbox" 
    className={`${ className } customCheckbox`} 
    { ...props }
  />
);