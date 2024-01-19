import React from 'react';
import cn from 'classnames';
import SVG, { IconNames } from 'UI/SVG';
import styles from './icon.module.css';

interface IProps { 
  name: IconNames
  size?: number | string
  height?: number
  width?: number
  color?: string
  className?: string
  style?: object
  marginRight?: number
  inline?: boolean
}

const Icon: React.FunctionComponent<IProps> = ({
  name,
  size = 12,
  height = size,
  width = size,
  color = 'gray-medium',
  className = '',
  style={},
  marginRight = 0,
  inline = false,
  ...props
}) => {
  const _style = {
    width: `${ width }px`,
    height: `${ height }px`,
    ...style,
  };
  if (marginRight){
    // @ts-ignore
    _style.marginRight = `${ marginRight }px`;
  }

  const additionalStyles = color === 'inherit' ? { fill: 'currentcolor' } : {}

  return (
    <span
      { ...props }
      style={{..._style, ...additionalStyles }}
      className={ cn(className, styles.wrapper, `fill-${ color }`) }
      data-inline={ inline }
    >
      <SVG name={ name } height={ height } width={ width } />
    </span>
  );
}

Icon.displayName = 'Icon';
export default Icon;
