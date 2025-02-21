import React from 'react';
import cn from 'classnames';
import { Checkbox as AntCheckbox } from 'antd'

interface Props {
    className?: string;
    label?: string;
    [x: string]: any;
}
export default (props: Props) => {
    const { className = '', label = '', ...rest } = props;
    return (
      <AntCheckbox {...rest}>
          {label}
      </AntCheckbox>
    );
};
