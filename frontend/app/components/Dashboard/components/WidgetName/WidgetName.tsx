import React, { useState, useRef, useEffect } from 'react';
import { Icon } from 'UI';
import { Input, Tooltip } from 'antd';
import cn from 'classnames';

interface Props {
  name: string;
  onUpdate: (name: any) => void;
  seriesIndex?: number;
  canEdit?: boolean
}
function WidgetName(props: Props) {
  const { canEdit = true } = props;
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(props.name)
  const ref = useRef<any>(null)

  const write = ({ target: { value } }) => {
    setName(value)
  }

  const onBlur = (nameInput?: string) => {
    setEditing(false)
    const toUpdate = nameInput || name
    props.onUpdate(toUpdate && toUpdate.trim() === '' ? 'New Widget' : toUpdate)
  }

  useEffect(() => {
    if (editing) {
      ref.current.focus()
    }
  }, [editing])

  useEffect(() => {
    setName(props.name)
  }, [props.name])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        onBlur(name)
      }
      if (e.key === 'Escape' || e.key === 'Esc') {
        setEditing(false)
      }
    }
    document.addEventListener('keydown', handler, false)

    return () => {
      document.removeEventListener('keydown', handler, false)
    }
  }, [name])

  return (
    <div className="flex items-center">
      { editing ? (
        <Input
          ref={ ref }
          name="name"
          value={name}
          onChange={write}
          onBlur={() => onBlur()}
          onFocus={() => setEditing(true)}
          maxLength={80}
          className='rounded-xl text-2xl'
        />
      ) : (
        // @ts-ignore
        <Tooltip delay={200} placement="bottom" title="Double click to rename" disabled={!canEdit}>
          <div
            onDoubleClick={() => setEditing(true)}
            className={
              cn(
                "text-2xl h-8 flex items-center border-transparent",
                canEdit && 'cursor-pointer select-none hover:bg-teal-light/10 px-3 rounded-xl'
              )
            }
          >
            { name }
          </div>
        </Tooltip>

      )}
      {/* { canEdit && <div className="ml-3 cursor-pointer" onClick={() => setEditing(true)}>
        <Tooltip title='Rename' placement='bottom'>
          <Icon name="pencil" size="16" />
        </Tooltip>
        </div> } */}
    </div>
  );
}

export default WidgetName;
