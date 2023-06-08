import React from 'react';
import cn from 'classnames';
import { Button, Icon, PageTitle } from 'UI';
import { observer } from 'mobx-react-lite';

function Header({ isTitleEditing, current, onCancel, onSave, setEditing }) {
  return (
    <>
      {isTitleEditing ? (
        <input
          name="flag-description"
          placeholder="Title..."
          autoFocus
          className="rounded fluid border px-2 py-1 w-full"
          value={current.name}
          onChange={(e) => {
            current.setName(e.target.value);
          }}
          onBlur={() => setEditing({ isTitleEditing: false })}
          onFocus={() => setEditing({ isTitleEditing: true })}
        />
      ) : (
        <div
          onClick={() => setEditing({ isTitleEditing: true })}
          className={cn(
            'cursor-pointer border-b w-fit flex items-center gap-2',
            'border-b-borderColor-transparent hover:border-dotted hover:border-gray-medium'
          )}
        >
          <PageTitle title={current.name} />
          <Icon name={'edit'} />
        </div>
      )}

      <div className={'flex items-center gap-2'}>
        <Button variant="text-primary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" onClick={onSave}>
          Save
        </Button>
      </div>
    </>
  );
}

export default observer(Header);
