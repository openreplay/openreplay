import React from 'react';
import { Link, Icon } from 'UI';
import cls from './backLink.module.css';
import cn from 'classnames';

export default function BackLink ({
  className, to, onClick, label = '', vertical = false, style
}) {
  const children = (
    <div className={ cn('flex items-center', {'border w-10 h-10 rounded-full bg-white p-3 items-center justify-center hover:bg-active-blue' : !label })}>
      <Icon color="gray-dark" className={ cls.icon } name="prev1" size="16" />
      { label && <div className="ml-1">{ label }</div> }
    </div>
  );
  const verticalClassName = cn(className, cls.backLink, "flex justify-center items-center pr-2 color-gray-dark", { "flex-col": vertical });
  return to ?
    <Link
      className={ verticalClassName }
      to={ to }
    >
     { children }
    </Link>
    :
    <button
      className={ verticalClassName }
      onClick={ onClick }
      style={style}
    >
      { children }
    </button>
}
