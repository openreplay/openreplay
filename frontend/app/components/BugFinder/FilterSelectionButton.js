import React from 'react';
import { Icon } from 'UI';
import stl from './filterSelectionButton.css';

const FilterSelectionButton = ({ label }) => {
  return (
    <div className={ stl.wrapper }>
      <span className="capitalize">{ label } </span>
      <Icon name="chevron-down"/>
    </div>
  );
};

export default FilterSelectionButton;
