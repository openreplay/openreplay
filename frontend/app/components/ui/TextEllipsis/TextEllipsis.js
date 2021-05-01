import cn from 'classnames';
import { Popup } from 'UI';
import styles from './textEllipsis.css';

const TextEllipsis = ({ 
	text,
	hintText = text,
	children, 
	maxWidth="auto",
	style = {}, 
	className="", 
	noHint=false,
	popupProps={},
	hintProps={},
	...props 
}) => {
	const textOrChildren = text || children;
	const trigger = (
	  <div 
	    className={ cn(styles.textEllipsis, className) }
	    style={{ maxWidth, ...style }}
	    { ...props }
	  >
	    { textOrChildren }
	  </div>
	);
	if (noHint) return trigger;
	return (
		<Popup
			trigger={ trigger }
      content={ <div className="customPopupText" { ...hintProps } >{ hintText || textOrChildren }</div> }
      { ...popupProps }
    />
	);
};

TextEllipsis.displayName ="TextEllipsis";

export default TextEllipsis;