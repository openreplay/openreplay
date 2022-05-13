import { useState, useRef, useEffect, forwardRef } from 'react';
import cn from 'classnames';
import { Popup } from 'UI';
import styles from './textEllipsis.css';

/** calculates text width in pixels 
+ * by creating a hidden element with t
+ * ext and counting its width
+ * @param text String - text string
+ * @param fontProp String - font properties
+ * @returns width number
+ */
function findTextWidth(text, fontProp) {
	const tag = document.createElement('div')

	tag.style.position = 'absolute'
	tag.style.left = '-99in'
	tag.style.whiteSpace = 'nowrap'
	tag.style.font = fontProp
	tag.innerHTML = text

	document.body.appendChild(tag)
	const result = tag.clientWidth
	document.body.removeChild(tag)

	return result;
}

const Trigger = forwardRef(({ textOrChildren, maxWidth, style, className, ...rest }, ref) => (
	<div 
		className={ cn(styles.textEllipsis, className) }
		style={{ maxWidth, ...style }}
		ref={ref}
		{ ...rest }
		>
			{ textOrChildren }
	</div>
))

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
	const [showPopup, setShowPopup] = useState(false)
	const textRef = useRef(null);

	const textOrChildren = text || children;
	
	const popupId = (Math.random() + 1).toString(36).substring(7);

	useEffect(() => {
		const element = textRef.current;

		const fontSize = window.getComputedStyle(element, null).getPropertyValue('font-size');
		
		const textWidth = findTextWidth(element.innerText, fontSize)
		if (textWidth > element.clientWidth) setShowPopup(true)
		else setShowPopup(false)
	}, [textRef.current])

	if (noHint || !showPopup) return (
		<Trigger 
			className={className} 
			maxWidth={maxWidth} 
			style={style} 
			textOrChildren={textOrChildren} 
			ref={textRef}
			{...props} 
		/>
	)

	return (
		<Popup
			trigger={ 
				<Trigger
					className={className} 
					maxWidth={maxWidth} 
					style={style} 
					textOrChildren={textOrChildren} 
					id={popupId}
					ref={textRef}
					{...props}  
				/> 
			}
			content={ <div className="customPopupText" { ...hintProps } >{ hintText || textOrChildren }</div> }
			{ ...popupProps }
   		/>
	);
};

TextEllipsis.displayName ="TextEllipsis";

export default TextEllipsis;