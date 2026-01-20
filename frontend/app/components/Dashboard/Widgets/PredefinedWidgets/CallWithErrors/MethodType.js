import React from 'react';
import { Tag } from 'antd';

function MethodType({ data }) {
  return (
    <Tag variant="filled" className="rounded-lg bg-indigo-lightest">
      {data.method}
    </Tag>
  );
}

export default MethodType;
