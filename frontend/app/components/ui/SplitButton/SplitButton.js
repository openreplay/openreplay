import React from 'react';
import { Button, Icon } from 'UI';
import cn from 'classnames';
import stl from './splitButton.module.css';

const SplitButton = ({primary, label, icon, onButtonClick, onIconClick, disabled = false }) => {
  return (
    <div className={cn('flex items-center', disabled? 'btn-disabled' : '')}>
      <Button size="small" outline className={ stl.left } onClick={ onButtonClick }>
        { label }
      </Button>
      <Button size="small" outline className={ stl.right } onClick={ onIconClick }>
        <Icon className={ stl.icon } name={ icon } size="14" color={ primary ? 'teal' : '' } />
      </Button>
    </div>
  );
};

export default SplitButton;
