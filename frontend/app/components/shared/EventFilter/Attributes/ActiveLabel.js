import React from 'react';
import stl from './activeLabel.css';

const ActiveLabel = ({ item, onRemove }) => {
  return (
    <div className={ stl.wrapper } onClick={ () => onRemove(item) }>{ item.text }</div>
  );
};

export default ActiveLabel;
