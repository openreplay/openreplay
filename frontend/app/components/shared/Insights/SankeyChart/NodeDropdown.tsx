import React from 'react';
// import Select from 'Shared/Select';
import { Dropdown, MenuProps, Select, Space } from 'antd';
import { DownOutlined, SmileOutlined } from '@ant-design/icons';

interface Props {
  payload: any;
}

function NodeDropdown(props: Props) {
  const items: MenuProps['items'] = [
    {
      key: '1',
      label: (
        <a target='_blank' rel='noopener noreferrer' href='https://www.antgroup.com'>
          1st menu item
        </a>
      )
    }
  ];
  return (
    <Select style={{ width: 120 }} placeholder='Slect Event' dropdownStyle={{
      border: 'none'
    }}>
      <Select.Option value='jack'>Jack</Select.Option>
      <Select.Option value='lucy'>Lucy</Select.Option>
    </Select>
  );
}

export default NodeDropdown;
