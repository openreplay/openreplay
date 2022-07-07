import React from 'react';
import cn from 'classnames';

export function Header({
  children,
  className,
}) {
  return (
    <div 
    	className={ cn("flex items-center justify-between border-bottom-gray-light pr-10 pl-2", className) }
    	style={{ height: "14%" }}
    >
      { children }
    </div>
  );
}


export function Body({ children }) {
	return (
		<div style={{ height: "86%" }}>
			{ children }
		</div>
	);
}

