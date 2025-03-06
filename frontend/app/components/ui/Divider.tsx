import React from 'react';
import { Divider as AntdDivider, DividerProps as AntdDividerProps } from 'antd';

const Divider: React.FC = (props: AntdDividerProps) => (
  <AntdDivider className={props.className} style={props.style} />
);

export default Divider;
