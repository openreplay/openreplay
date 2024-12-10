import React from 'react';
import cn from 'classnames';
import cls from './infoLine.module.css';

const InfoLine = ({ children }) => (
	<div className={ cn(cls.info, 'text-sm')}>
		{ children }
	</div>
)

const Point = ({ label = '', value = '', display=true, color, dotColor }) => display 
	? <div className={ cn(cls.infoPoint, 'text-sm') } style={{ color }}>
			{ dotColor != null && <div className={ cn(cls.dot, `bg-${dotColor}`) } />  } 
			<span className={cn(cls.label, 'text-sm')}>{ `${label}` }</span> { value }
		</div>
	: null;

InfoLine.Point = Point;

export default InfoLine;
