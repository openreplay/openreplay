import cn from 'classnames';
import { Icon } from 'UI';
import stl from './controlButton.css';

const ControlButton = ({ label, icon, disabled=false, onClick, count = 0, hasErrors=false, active=false }) => (
	<button
    className={ cn(stl.controlButton, { [stl.disabled]: disabled, [stl.active]: active }) }
    onClick={ onClick }
    id={"control-button-" + label.toLowerCase()}
    disabled={disabled}
  >
  	<div className="relative">
      { count > 0 && <div className={ stl.countLabel }>{ count }</div>}
      { hasErrors && <div className={ stl.errorSymbol } /> }
	    <Icon name={ icon } size="20" color="gray-dark"/>
	   </div>
    <span className={ stl.label }>{ label }</span>
  </button>
);

ControlButton.displayName = 'ControlButton';

export default ControlButton;