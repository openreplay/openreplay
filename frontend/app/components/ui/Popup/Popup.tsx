import React from 'react';
// import { Popup } from 'semantic-ui-react';
import { Tooltip } from 'react-tippy';

interface Props {
  content?: any;
  title?: any;
  trigger?: any
  position?: any
  [x:string]: any;
}
export default ({
  position = 'top',
  title='',
  ...props
}: Props) => (
  <Tooltip
    { ...props }
    trigger="mouseenter"
    html={props.content || props.title}
    arrow
    // title={ props.content }
    // position={ position }
    // html={ props.children }
  >
    { props.children }
  </Tooltip>
);
