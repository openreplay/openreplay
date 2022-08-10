import React from 'react';
import cn from "classnames";

function ErrorText({ className, icon, name, message, bold, lineThrough = false }) {
	return (
    <div className={ cn("mb-1 truncate", { "font-weight-bold": bold }) }>
      {/* { icon && <Icon name={icon} className="float-left mr-2" size="14" style={{ marginTop: '1px'}}/> } */}
      <span className={cn("code-font color-red", className, { 'line-through' : lineThrough })}>{ name }</span>
      <span className={cn('color-gray-darkest ml-2', { 'line-through' : lineThrough })}>{ message }</span>
    </div>
	);
}

ErrorText.displayName = "ErrorText";

export default ErrorText;