import React, { useState, useRef, useEffect } from 'react';
import { Icon } from 'UI';

interface Props {
  name: string;
  onUpdate: (name) => void;
}
function SeriesName(props: Props) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(props.name)
  const ref = useRef<any>(null)

  const write = ({ target: { value, name } }) => {
    setName(value)
  }

  const onBlur = () => {
    setEditing(false)
    props.onUpdate(name)
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
          className="fluid border-0 -mx-2 px-2"
          value={name}
          // readOnly={!editing} 
          onChange={write}
          onBlur={onBlur}
          onFocus={() => setEditing(true)}
        />
      ) : (
        <div className="text-base">{name}</div>
      )}
      
      <div className="ml-3 cursor-pointer" onClick={() => setEditing(true)}><Icon name="pencil" size="14" /></div>
    </div>
  );
}

export default SeriesName;