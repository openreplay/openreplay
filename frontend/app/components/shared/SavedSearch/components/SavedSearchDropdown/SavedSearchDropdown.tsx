import React from 'react';
import stl from './SavedSearchDropdown.css';
import { Icon } from 'UI';
import { applyFilter } from 'Duck/search'
import { connect } from 'react-redux';

interface Props {
  list: Array<any>
  applyFilter: (filter: any) => void
}

function Row ({ name, onClick }) {
  return (
    <div
      onClick={onClick}
      className="flex items-center cursor-pointer hover:bg-active-blue"
    >
      <div className="px-3 py-2">{name}</div>
      <div className="ml-auto flex items-center">
        <div className="cursor-pointer px-2 hover:bg-active-blue"><Icon name="pencil" size="14" /></div>
        <div className="cursor-pointer px-2 hover:bg-active-blue"><Icon name="trash" size="14" /></div>
      </div>
    </div>
  )
}

function SavedSearchDropdown(props: Props) {
  const onClick = (item) => {
    props.applyFilter(item.filter)
  }
  return (
    <div className={stl.wrapper}>
      {props.list.map(item => (
        <Row key={item.searchId} name={item.name} onClick={() => onClick(item)} />
      ))}
    </div>
  );
}

export default connect(null, { applyFilter })(SavedSearchDropdown);