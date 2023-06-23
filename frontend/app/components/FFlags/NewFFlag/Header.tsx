import React from 'react';
import { Button } from 'UI';
import { observer } from 'mobx-react-lite';
import cn from "classnames";

function Header({ current, onCancel, onSave, isNew }: any) {
  return (
    <>
      <div>
        <h1 className={cn('text-2xl')}>{!current.flagKey ? 'New Feature Flag' : current.flagKey}</h1>
      </div>

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
