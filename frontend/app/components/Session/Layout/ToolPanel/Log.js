import React from 'react';
import cn from 'classnames';
import { Icon } from 'UI';

import cls from './Log.module.css';


function getIconProps(level) {
  switch (level) {
    case "info":
      return {
        name: 'console/info',
        color: 'blue2',
      };
    case "warn":
      return {
        name: 'console/warning',
        color: 'red2',
      };
    case "error":
      return {
        name: 'console/error',
        color: 'red',
      };
  }
  return null;
};


function renderWithNL(s = '') {
  if (typeof s !== 'string') return '';
  return s.split('\n').map((line, i) => <div className={ cn({ "ml-20": i !== 0 }) }>{ line }</div>)
}


/*
	level is "info"/"warn"/"error"
*/
export default function Log({ text, level, onClick }) {
	return (
		<div 
      className={ cn("flex items-start font-mono cursor-pointer border-b border-gray-light-shade", cls.line, level) }
      data-scroll-item={ level === "error" }
      onClick={ onClick } 
    >
      <Icon size="14" className="pt-1" { ...getIconProps(level) } />
      <div className={ cn("overflow-y-auto ml-20", cls.message)}>{ renderWithNL(text) }</div>
    </div>
	);
}