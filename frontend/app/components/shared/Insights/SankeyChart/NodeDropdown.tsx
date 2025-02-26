import React from 'react';
import { MenuProps, Select } from 'antd';

interface Props {
  payload: any;
}

function NodeDropdown(props: Props) {
  return (
    <Select
      style={{ width: 120 }}
      placeholder="Slect Event"
      dropdownStyle={{
        border: 'none',
      }}
    >
      <Select.Option value="jack">Jack</Select.Option>
      <Select.Option value="lucy">Lucy</Select.Option>
    </Select>
  );
}

export default NodeDropdown;
