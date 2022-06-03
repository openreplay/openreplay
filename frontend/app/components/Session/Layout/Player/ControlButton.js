import React from 'react';
import cn from 'classnames';
import { Icon } from 'UI';
import stl from './controlButton.module.css';

export default function ControlButton({ label, icon, onClick, disabled=false, count = 0, hasErrors=false, active=false }) {
	return (
    <button
      className={ cn(stl.controlButton, { [stl.disabled]: disabled, [stl.active]: active }) }
      onClick={ onClick }
    >
    	<div className="relative">
        { count > 0 && <div className={ stl.countLabel }>{ count }</div>}
        { hasErrors && <div className={ stl.errorSymbol } /> }
  	    <Icon name={ icon } size="20" color="gray-dark"/>
  	   </div>
      <span className={ stl.label }>{ label }</span>
    </button>
  );
}
