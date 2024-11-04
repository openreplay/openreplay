import React from 'react';
import cn from 'classnames';
import cls from './infoLine.module.css';

const InfoLine = ({ children }) => (
	<div className={ cls.info }>
		{ children }
	</div>
)

const Point = ({ label = '', value = '', display=true, color, dotColor }) => display 
	? <div className={ cls.infoPoint } style={{ color }}>
			{ dotColor != null && <div className={ cn(cls.dot, `bg-${dotColor}`) } />  } 
			<span className={cls.label}>{ `${label}` }</span> { value }
		</div>
	: null;

InfoLine.Point = Point;

export default InfoLine;
