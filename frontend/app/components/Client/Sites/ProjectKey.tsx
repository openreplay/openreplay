import { withCopy } from 'HOCs';
import React from 'react';
import { Tag } from 'antd';

function ProjectKey({ value }: any) {
  return (
    <div className="w-fit">
      <Tag bordered={false} className="text-base font-mono">
        {value}
      </Tag>
    </div>
  );
}

export default withCopy(ProjectKey);
