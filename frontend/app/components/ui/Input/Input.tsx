import cn from 'classnames';
import React from 'react';
import { Input as AntInput } from 'antd';
import { Icon } from 'UI';

interface Props {
  wrapperClassName?: string;
  className?: string;
  icon?: string;
  leadingButton?: React.ReactNode;
  type?: string;
  rows?: number;
  height?: number;
  width?: number;
  [x: string]: any;
}
const Input = React.forwardRef((props: Props, ref: any) => {
  const {
    height = 36,
    width = 0,
    className = '',
    leadingButton = '',
    wrapperClassName = '',
    icon = '',
    type = 'text',
    rows = 4,
    ...rest
  } = props;
  return (
    <div className={cn({ relative: icon || leadingButton }, wrapperClassName)}>
      {icon && (
        <Icon
          name={icon}
          className="absolute top-0 bottom-0 my-auto ml-4 z-10"
          size="14"
        />
      )}
      {type === 'textarea' ? (
        <AntInput.TextArea
          ref={ref}
          rows={rows}
          style={{ resize: 'none' }}
          maxLength={500}
          className={cn(
            'p-2 border border-gray-light bg-white w-full rounded-lg',
            className,
            { 'pl-10': icon },
          )}
          {...rest}
        />
      ) : (
        <AntInput
          ref={ref}
          type={type}
          style={{ height: `${height}px`, width: width ? `${width}px` : '' }}
          className={cn(
            'p-2 border border-gray-light bg-white w-full rounded-lg',
            className,
            { 'pl-10': icon },
          )}
          {...rest}
        />
      )}

      {leadingButton && (
        <div className="absolute top-0 bottom-0 right-0">{leadingButton}</div>
      )}
    </div>
  );
});

export default Input;
