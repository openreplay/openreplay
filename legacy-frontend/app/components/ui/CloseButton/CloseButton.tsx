import React from 'react';
import { Icon } from 'UI';

export default function CloseButton({ size, onClick, className = '', style }: { size?: number | string; onClick?: () => void; className?: string; style?: React.CSSProperties }){
	return (
	  <button onClick={ onClick } className={ `${ className } cursor-pointer` } style={ style } >
	    <Icon name="close" size={ size } color="gray-medium"/>
	  </button>
	);
}
