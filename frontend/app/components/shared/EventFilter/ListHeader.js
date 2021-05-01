import React from 'react';
import stl from './listHeader.css';

const ListHeader = ({ title }) => {
  return (
    <div className={ stl.header }>{ title }</div>
  );
};

export default ListHeader;
