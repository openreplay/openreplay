import React from 'react';
import { Switch as AntdSwitch, SwitchProps as AntdSwitchProps } from 'antd';

interface SwitchProps extends AntdSwitchProps {
  customProp?: boolean;
  // Add any additional custom props here
}

const Switch: React.FC<SwitchProps> = ({ customProp, ...restProps }) => {
  return <AntdSwitch {...restProps} />;
};

export default Switch;
