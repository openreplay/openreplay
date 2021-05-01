import { Select } from 'semantic-ui-react';

export default ({
  placeholder, options, value, onChange, ...props
}) => (
  <Select
    { ...props }
    placeholder={ placeholder }
    options={ options }
    value={ value }
    onChange={ onChange }
    selection
  />
);
