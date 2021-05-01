import cn from "classnames";

function Label({ className, topValue, topValueSize = 'text-base', bottomValue, topMuted = false, bottomMuted = false }) {
  return (
  	<div className={ cn(className, "flex flex-col items-center px-4") } >
	    <div className={ cn(topValueSize, { "color-gray-medium": topMuted }) } >{ topValue }</div>
	    <div className={ cn("font-light text-sm", { "color-gray-medium": bottomMuted }) }>{ bottomValue }</div>
	  </div>
	);
}

Label.displayName = "Label";

export default Label;