import React from 'react';
import cn from "classnames";

interface Props {
	className?: string;
	topValue: string;
	topValueSize?: string;
	bottomValue: string;
	topMuted?: boolean;
	bottomMuted?: boolean;
}
function ErrorLabel({ className, topValue, topValueSize = 'text-base', bottomValue, topMuted = false, bottomMuted = false }: Props) {
  return (
  	<div className={ cn(className, "flex flex-col items-center px-4") } >
	    <div className={ cn(topValueSize, { "color-gray-medium": topMuted }) } >{ topValue }</div>
	    <div className={ cn("font-light text-sm", { "color-gray-medium": bottomMuted }) }>{ bottomValue }</div>
	  </div>
	)
}

ErrorLabel.displayName = "ErrorLabel";

export default ErrorLabel;