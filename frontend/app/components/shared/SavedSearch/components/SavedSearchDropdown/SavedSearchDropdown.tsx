import React from 'react';
import stl from './SavedSearchDropdown.css';
import cn from 'classnames';
import { Icon } from 'UI';
import { applySavedSearch, remove, edit } from 'Duck/search'
import { connect } from 'react-redux';
import { confirm } from 'UI/Confirmation';

interface Props {
  list: Array<any>
  applySavedSearch: (filter: any) => void
  remove: (id: string) => Promise<void>
  onClose: () => void,
  edit: (filter: any) => void,
}

function Row ({ name, isPublic, onClick, onClickEdit, onDelete }) {
  return (
    <div
      onClick={onClick}
      className={cn(stl.rowItem, "flex items-center cursor-pointer hover:bg-active-blue")}
    >
      <div className="px-3 py-2">{name}</div>
      <div className="ml-auto flex items-center">
        { isPublic && <div className="cursor-pointer px-2 hover:bg-active-blue"><Icon name="user-friends" size="14" /></div> }
        {/* <div className="cursor-pointer px-2 hover:bg-active-blue" onClick={onClickEdit}><Icon name="pencil" size="14" /></div> */}
        {/* <div className="cursor-pointer px-2 hover:bg-active-blue" onClick={onDelete}><Icon name="trash" size="14" /></div> */}
      </div>
    </div>
  )
}

function SavedSearchDropdown(props: Props) {
  const [query, setQuery] = React.useState('');
  const filteredList = query ? props.list.filter(item => item.name.toLowerCase().includes(query.toLowerCase())) : props.list;
  const onClick = (item) => {
    props.applySavedSearch(item)
    // props.edit(item.filter)
    props.onClose()
  }

  const onDelete = async (instance) => {
    if (await confirm({
      header: 'Confirm',
      confirmButton: 'Yes, Delete',
      confirmation: `Are you sure you want to permanently delete this search?`
    })) {
      props.remove(instance.alertId).then(() => {
        // toggleForm(null, false);
      });
    }
  }

  const onClickEdit = (instance) => {
    // toggleForm(instance);
  }

  return (
    <div className={cn(stl.wrapper, 'shadow')}>
      <div className="w-full border p-1">
        <input
          placeholder='Search'
          autoFocus
          className="border p-1 w-full rounded"
          style={{ border: 'solid thin #ddd'}}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {filteredList.map(item => (
        <Row
          key={item.searchId}
          name={item.name}
          onClick={() => onClick(item)}
          onDelete={() => onDelete(item) }
          onClickEdit={() => onClickEdit(item)}
          isPublic={item.isPublic}
        />
      ))}
    </div>
  );
}

export default connect(null, { applySavedSearch, remove, edit })(SavedSearchDropdown);