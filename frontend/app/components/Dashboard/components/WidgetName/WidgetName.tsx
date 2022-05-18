import React, { useState, useRef, useEffect } from 'react';
import { Icon } from 'UI';

interface Props {
  name: string;
  onUpdate: (name) => void;
  seriesIndex?: number;
  canEdit?: boolean
}
function WidgetName(props: Props) {
  const { canEdit = true } = props;
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(props.name)
  const ref = useRef<any>(null)

  const write = ({ target: { value, name } }) => {
    setName(value)
  }

  const onBlur = () => {
    setEditing(false)
    props.onUpdate(name.trim() === '' ? 'New Widget' : name)
  }

  useEffect(() => {
    if (editing) {
      ref.current.focus()
    }
  }, [editing])

  useEffect(() => {
    setName(props.name)
  }, [props.name])

  // const { name } = props;

  return (
    <div className="flex items-center">
      { editing ? (
        <input
          ref={ ref }
          name="name"
          className="rounded fluid border-0 -mx-2 px-2 h-8"
          value={name}
          onChange={write}
          onBlur={onBlur}
          onFocus={() => setEditing(true)}
        />
      ) : (
        <div className="text-2xl h-8 flex items-center border-transparent">{ name }</div>
      )}
      { canEdit && <div className="ml-3 cursor-pointer" onClick={() => setEditing(true)}><Icon name="pencil" size="14" /></div> }
    </div>
  );
}

export default WidgetName;
