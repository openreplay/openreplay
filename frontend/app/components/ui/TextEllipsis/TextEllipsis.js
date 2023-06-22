import React from 'react';
import { useState, useRef, useEffect, forwardRef } from 'react';
import cn from 'classnames';
import { Tooltip } from 'antd';
import styles from './textEllipsis.module.css';

/** calculates text width in pixels
 * by creating a hidden element with
 * text and counting its width
 * @param text String - text string
 * @param fontProp String - font properties
 * @returns width number
 */
function findTextWidth(text, fontProp) {
  const tag = document.createElement('div');

  tag.style.position = 'absolute';
  tag.style.left = '-99in';
  tag.style.whiteSpace = 'nowrap';
  tag.style.font = fontProp;
  tag.innerHTML = text;

  document.body.appendChild(tag);
  const result = tag.clientWidth;
  document.body.removeChild(tag);

  return result;
}

const Trigger = forwardRef(({ textOrChildren, maxWidth, style, className, ...rest }, ref) => (
  <div
    className={cn(styles.textEllipsis, className)}
    style={{ maxWidth, ...style }}
    ref={ref}
    {...rest}
  >
    {textOrChildren}
  </div>
));

const TextEllipsis = ({
  text,
  hintText = text,
  children = null,
  maxWidth = 'auto',
  style = {},
  className = '',
  noHint = false,
  popupProps = {},
  hintProps = {},
  ...props
}) => {
  const [showPopup, setShowPopup] = useState(false);
  const [computed, setComputed] = useState(false);
  const textRef = useRef(null);

  const textOrChildren = text || children;

  const popupId = (Math.random() + 1).toString(36).substring(2);

  useEffect(() => {
    if (computed) return;
    if (textRef.current) {
      const element = textRef.current;

      const fontSize = window.getComputedStyle(element, null).getPropertyValue('font-size');

      const textWidth = findTextWidth(element.innerText, fontSize);
      if (textWidth > element.clientWidth) setShowPopup(true);
      else setShowPopup(false);
      setComputed(true);
    }
  }, [textRef.current, computed]);

  if (noHint || !showPopup)
    return (
      <Trigger
        className={className}
        maxWidth={maxWidth}
        style={style}
        textOrChildren={textOrChildren}
        ref={textRef}
        {...props}
      />
    );

  return (
    <Tooltip
      title={
        <div className="customPopupText" {...hintProps}>
          {hintText || textOrChildren}
        </div>
      }
      {...popupProps}
    >
      <Trigger
        className={className}
        maxWidth={maxWidth}
        style={style}
        textOrChildren={textOrChildren}
        id={popupId}
        ref={textRef}
        {...props}
      />
    </Tooltip>
  );
};

TextEllipsis.displayName = 'TextEllipsis';

export default TextEllipsis;
