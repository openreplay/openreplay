import React from 'react';
import cn from "classnames";
import { Icon, Popup } from 'UI';

export default function QuestionMarkHint({ onHover = false, content, ...props }) {
	return (
		<Popup
      trigger={ onHover ? 'mouseenter' : 'click'}
      content={ content }
      interactive
      { ...props }
    >
      <Icon name="question-circle"  size="18" className={ cn("cursor-pointer") }/>
    </Popup>
	);
}