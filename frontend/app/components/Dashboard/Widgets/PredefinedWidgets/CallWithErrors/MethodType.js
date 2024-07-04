import React from 'react';
import { Tag } from 'antd';

const MethodType = ({ data }) => {
  return (
    <Tag bordered={false} className="rounded-lg">
      {data.method}
    </Tag>
  );
};

export default MethodType;
