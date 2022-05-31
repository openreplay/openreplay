import React from 'react';
import cn from 'classnames';

interface Props {
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  [x: string]: any
}
export default (props: Props) => {
  const {
    className = '',
    variant = "default",
    type = "button",
    size = '',
    disabled = false,
    children,
    ...rest
  } = props;

  const classes = ['flex items-center h-10 px-3 rounded tracking-wide'];
  if (variant === 'default') {
    classes.push('bg-white hover:bg-gray-lightest border border-gray-light')
  }

  if (variant === 'primary') {
    classes.push('bg-teal color-white hover:bg-teal-dark')
  }

  if (variant === 'text') {
    classes.push('bg-transparent color-gray-dark hover:bg-gray-lightest hover:color-gray-dark')
  }

  if (variant === 'text-primary') {
    classes.push('bg-transparent color-teal hover:bg-teal-light hover:color-teal-dark')
  }

  if (variant === 'outline') {
    classes.push('bg-white color-teal border border-teal hover:bg-teal-light')
  }

  if (disabled) {
    classes.push('opacity-40 pointer-events-none')
  }

  return (
    <button
      { ...rest }
      type={type}
      className={ cn(classes, className ) }
    >
      {children}
    </button>
  );
}
