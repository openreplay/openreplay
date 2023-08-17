import React from 'react';
import Select from 'Shared/Select';
import { Dropdown, MenuProps, Space } from 'antd';
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
    <div>
      <Dropdown menu={{ items }}>
        <a onClick={(e) => e.preventDefault()}>
          <Space>
            Hover me
            <DownOutlined />
          </Space>
        </a>
      </Dropdown>
      {/*<Select*/}
      {/*  plain={true}*/}
      {/*  name="projectId"*/}
      {/*  options={options}*/}
      {/*  defaultValue={1}*/}
      {/*  fluid*/}
      {/*  onChange={() => {}}*/}
      {/*  placeholder="Project"*/}
      {/*/>*/}
    </div>
  );
}

export default NodeDropdown;
