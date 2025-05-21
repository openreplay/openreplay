import React from 'react';
import { Tag } from 'antd';

function MethodType({ data }) {
  return (
    <Tag bordered={false} className="rounded-lg bg-indigo-lightest">
      {data.method}
    </Tag>
  );
}

export default MethodType;
