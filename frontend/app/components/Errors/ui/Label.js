import React from 'react';
import cn from "classnames";

function Label({ className, topValue, topValueSize = 'text-base', bottomValue, topMuted = false, bottomMuted = false, horizontal = false }) {
  return (
  	<div className={ cn(className, "flex items-center px-4", horizontal ? '!pl-0' : 'flex-col') } >
	    <div className={ cn(topValueSize, { "color-gray-medium": topMuted }, horizontal ? 'mr-2' : '') } >{ topValue }</div>
	    <div className={ cn("font-light text-sm", { "color-gray-medium": bottomMuted }) }>{ bottomValue }</div>
	  </div>
	);
}

Label.displayName = "Label";

export default Label;
