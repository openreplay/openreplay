import React from 'react';
import { Tooltip } from 'react-tippy';

interface Props {
  content?: any;
  title?: any;
  trigger?: any
  position?: any
  className?: string
  delay?: number
  disabled?: boolean
  arrow?: boolean
  open?: boolean
  [x:string]: any;
}
export default ({
  position = 'top',
  title='',
  className='',
  trigger = 'mouseenter',
  delay = 1000,
  disabled = false,
  arrow = true,
  ...props
}: Props) => (
  <Tooltip
    // {...props}
    className={className}
    trigger={trigger}
    html={props.content || props.title}
    disabled={disabled}
    arrow={arrow}
    delay={delay}
    hideOnClick={true}
    hideOnScroll={true}
  >
    { props.children }
  </Tooltip>
);
