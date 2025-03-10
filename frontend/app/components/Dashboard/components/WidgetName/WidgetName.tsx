import React, { useState, useRef, useEffect } from 'react';
import { Input, Tooltip } from 'antd';
import cn from 'classnames';
import { useTranslation } from 'react-i18next';

interface Props {
  name: string;
  onUpdate: (name: string) => void;
  seriesIndex?: number;
  canEdit?: boolean;
}

function WidgetName(props: Props) {
  const { t } = useTranslation();
  const { canEdit = true } = props;
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(props.name);
  const ref = useRef<any>(null);

  const write = ({ target: { value } }) => {
    setName(value);
  };

  const onBlur = (nameInput?: string) => {
    setEditing(false);
    const toUpdate = nameInput || name;
    props.onUpdate(
      toUpdate && toUpdate.trim() === '' ? 'New Widget' : toUpdate,
    );
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onBlur(name);
    }
    if (e.key === 'Escape' || e.key === 'Esc') {
      setEditing(false);
    }
  };

  useEffect(() => {
    if (editing) {
      ref.current.focus();
    }
  }, [editing]);

  useEffect(() => {
    setName(props.name);
  }, [props.name]);

  return (
    <div className="flex items-center">
      {editing ? (
        <Input
          ref={ref}
          name="name"
          value={name}
          onChange={write}
          onBlur={() => onBlur()}
          onKeyDown={onKeyDown}
          onFocus={() => setEditing(true)}
          maxLength={40}
          className="bg-white text-2xl ps-2 rounded-lg h-8"
        />
      ) : (
        // @ts-ignore
        <Tooltip mouseEnterDelay={1} title={t('Click to edit')} disabled={!canEdit}>
          <div
            onClick={() => setEditing(true)}
            className={cn(
              'text-2xl h-8 flex items-center p-2 rounded-lg',
              canEdit && 'cursor-pointer select-none ps-2 hover:bg-teal/10',
            )}
          >
            {name}
          </div>
        </Tooltip>
      )}
    </div>
  );
}

export default WidgetName;
