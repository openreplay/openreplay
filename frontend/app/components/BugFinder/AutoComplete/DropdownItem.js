import React from 'react';
import stl from './dropdownItem.css';

const DropdownItem = ({ value, onSelect }) => {
  return (
    <div className={ stl.wrapper } onClick={ onSelect } >{ value }</div>
  );
};

export default DropdownItem;
