import React from 'react';
import cn from 'classnames';
import stl from './information.module.css';

function Information({ primary = true, content = '' }) {
  return (
    <div className={cn(stl.wrapper, { [stl.primary]: primary })}>{content}</div>
  );
}

export default Information;
