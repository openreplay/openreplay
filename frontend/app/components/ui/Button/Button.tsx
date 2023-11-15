import React from 'react';
import cn from 'classnames';
import { CircularLoader, Icon, Tooltip } from 'UI';

interface Props {
  className?: string;
  children?: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLElement>) => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'default' | 'primary' | 'text' | 'text-primary' | 'text-red' | 'outline' | 'green';
  loading?: boolean;
  icon?: string;
  iconSize?: number;
  rounded?: boolean;
  tooltip?: any;
  [x: string]: any;
}
export default (props: Props) => {
  const {
    icon = '',
    iconSize = 18,
    className = '',
    variant = 'default', // 'default|primary|text|text-primary|text-red|outline',
    type = 'button',
    size = '',
    disabled = false,
    children,
    loading = false,
    rounded = false,
    tooltip = null,
    ...rest
  } = props;

  let iconColor = variant === 'text' || variant === 'default' ? 'gray-dark' : 'teal';

  const variantClasses = {
    default: 'bg-white hover:!bg-gray-light border border-gray-light',
    primary: 'bg-teal color-white hover:bg-teal-dark',
    green: 'bg-green color-white hover:bg-green-dark',
    text: 'bg-transparent text-black hover:bg-active-blue hover:!text-teal hover-fill-teal',
    'text-primary': 'bg-transparent color-teal hover:bg-teal-light hover:color-teal-dark',
    'text-red': 'bg-transparent color-red hover:bg-teal-light',
    outline: 'bg-white color-teal border border-teal hover:bg-teal-light',
  };

  let classes = cn(
    'relative flex items-center h-10 px-3 rounded tracking-wide whitespace-nowrap',
    variantClasses[variant],
    { 'opacity-40 pointer-events-none': disabled },
    { '!rounded-full h-10 w-10 justify-center': rounded },
    className,
    'btn'
  );

  if (variant === 'primary') {
    iconColor = 'white';
  }
  if (variant === 'text-red') {
    iconColor = 'red';
  }

  const render = () => (
    <button {...rest} type={type} className={cn(classes, className, 'flex items-center justify-center')}>
      {icon && (
        // @ts-ignore
        <Icon className={cn({ 'mr-2': children })} name={icon} color={iconColor} size={iconSize} />
      )}
      {loading && (
        <div className="absolute flex items-center justify-center inset-0 z-1 rounded">
          <CircularLoader />
        </div>
      )}
      <div className={cn({ 'opacity-0': loading }, 'flex items-center')}>{children}</div>
    </button>
  );

  return tooltip ? (
    <Tooltip title={tooltip.title} {...tooltip}>
      {render()}
    </Tooltip>
  ) : (
    render()
  );
};
