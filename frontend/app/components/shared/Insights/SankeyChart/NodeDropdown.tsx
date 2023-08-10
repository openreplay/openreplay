import React from 'react';
import Select from 'Shared/Select';

interface Props {
  payload: any;
}
function NodeDropdown(props: Props) {
    const options: any = [
        { label: 'Root Page', value: '1' },
        { label: 'Parent Page', value: '2' },
        { label: 'Child Page', value: '3' },
    ]
  return (
    <div>
      <Select
        plain={true}
        name="projectId"
        options={options}
        defaultValue={1}
        fluid
        onChange={() => {}}
        placeholder="Project"
      />
    </div>
  );
}

export default NodeDropdown;
