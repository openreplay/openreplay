import React from 'react';
import { Divider as AntdDivider, DividerProps as AntdDividerProps } from 'antd';


interface DividerProps extends AntdDividerProps {
  customProp?: boolean;
}

const Divider: React.FC<DividerProps> = ({ customProp, ...restProps }) => {
  return <AntdDivider {...restProps} />;
};

export default Divider;