import React from 'react';
import { Checkbox as AntCheckbox } from 'antd';

interface Props {
  className?: string;
  label?: string;
  [x: string]: any;
}
export default function (props: Props) {
  const { className = '', label = '', ...rest } = props;
  return <AntCheckbox {...rest}>{label}</AntCheckbox>;
}
