import React from 'react';
import { Tooltip } from 'react-tippy';

interface Props {
  content?: any;
  title?: any;
  trigger?: any
  position?: any
  className?: string
  [x:string]: any;
}
export default ({
  position = 'top',
  title='',
  className='',
  trigger = 'mouseenter',
  ...props
}: Props) => (
  <Tooltip
    { ...props }
    className={className}
    trigger={trigger}
    html={props.content || props.title}
    arrow
  >
    { props.children }
  </Tooltip>
);
