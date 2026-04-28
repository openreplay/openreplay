import React from 'react';
import cn from 'classnames';
import cls from './infoLine.module.css';

function InfoLine({ children }) {
  return <div className={cn(cls.info, 'text-sm')}>{children}</div>;
}

function Point({ label = '', value = '', display = true, color, dotColor }) {
  return display ? (
    <div className={cn(cls.infoPoint, 'text-sm')} style={{ color }}>
      {dotColor != null && <div className={cn(cls.dot, `bg-${dotColor}`)} />}
      <span className={cn(cls.label, 'text-sm')}>{`${label}`}</span> {value}
    </div>
  ) : null;
}

InfoLine.Point = Point;

export default InfoLine;
