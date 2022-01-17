import React from 'react';
import stl from './SavedSearchDropdown.css';

interface Props {
  list: Array<any>
}

function Row ({ name }) {
  return (
    <div className="p-2 cursor-pointer hover:bg-gray-lightest">{name}</div>
  )
}

function SavedSearchDropdown(props: Props) {
  return (
    <div className={stl.wrapper}>
      {props.list.map(item => (
        <Row key={item.searchId} name={item.name} />
      ))}
    </div>
  );
}

export default SavedSearchDropdown;