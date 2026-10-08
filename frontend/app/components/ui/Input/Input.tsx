import { Icon } from '@/ui/icons/Icon';
import { Input as KitInput } from '@/ui/inputs/input';
import { Textarea } from '@/ui/inputs/textarea';
import cn from 'classnames';
import React from 'react';

interface Props {
  wrapperClassName?: string;
  className?: string;
  /** legacy `Icon` name, drawn as the field's prefix */
  icon?: string;
  leadingButton?: React.ReactNode;
  type?: string;
  rows?: number;
  height?: number;
  width?: number;
  [x: string]: any;
}

/** Legacy entry point; the kit input / textarea underneath. */
const Input = React.forwardRef((props: Props, ref: any) => {
  const {
    height,
    width = 0,
    className = '',
    leadingButton = '',
    wrapperClassName = '',
    icon = '',
    type = 'text',
    rows = 4,
    onPressEnter,
    allowClear: _allowClear,
    inputProps,
    ...rest
  } = props;
  return (
    <div className={cn({ relative: leadingButton }, wrapperClassName)}>
      {type === 'textarea' ? (
        <Textarea
          ref={ref}
          rows={rows}
          maxLength={500}
          className={cn('resize-none', className)}
          {...rest}
        />
      ) : (
        <KitInput
          ref={ref}
          type={type}
          size={height && height > 32 ? 'md' : 'sm'}
          style={width ? { width } : undefined}
          className={className}
          prefix={icon ? <Icon name={icon as any} size="14" /> : undefined}
          onKeyDown={
            onPressEnter
              ? (e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === 'Enter') onPressEnter(e);
                }
              : undefined
          }
          {...inputProps}
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
