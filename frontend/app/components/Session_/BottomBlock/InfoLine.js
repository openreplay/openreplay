import React from 'react';
import cn from 'classnames';
import cls from './infoLine.module.css';

function InfoLine({ children }) {
  return <div className={cls.info}>{children}</div>;
}

function Point({ label, value, display = true, color, dotColor }) {
  return display ? (
    <div className={cls.infoPoint} style={{ color }}>
      {dotColor != null && <div className={cn(cls.dot, `bg-${dotColor}`)} />}
      <span className={cls.label}>{`${label}`}</span> {value}
    </div>
  ) : null;
}

InfoLine.Point = Point;

export default InfoLine;
