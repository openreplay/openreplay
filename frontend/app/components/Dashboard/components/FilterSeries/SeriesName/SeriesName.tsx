import React, { useState, useRef, useEffect } from 'react';
import { Icon } from 'UI';
import {Input, Tooltip} from 'antd';

interface Props {
  name: string;
  onUpdate: (name) => void;
  seriesIndex?: number;
}
function SeriesName(props: Props) {
  const { seriesIndex = 1 } = props;
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
        <Input
          ref={ ref }
          name="name"
          value={name}
          // readOnly={!editing} 
          onChange={write}
          onBlur={onBlur}
          onFocus={() => setEditing(true)}
          className='bg-white text-lg font-medium rounded-lg'
        />
      ) : (
        <Tooltip placement='bottom' title='Double click to edit'><div className="text-lg font-medium hover:bg-teal-light/10 px-2 rounded-lg cursor-pointer" onDoubleClick={() => setEditing(true)}>{name && name.trim() === '' ? 'Series ' + (seriesIndex + 1) : name }</div>
        </Tooltip>
      )}
    </div>
  );
}

export default SeriesName;