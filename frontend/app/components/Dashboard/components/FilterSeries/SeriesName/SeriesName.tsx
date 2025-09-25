import React, { useState, useRef, useEffect } from 'react';
import { Input, Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';

interface Props {
  name: string;
  onUpdate: (name: string) => boolean;
  onChange: () => void;
  seriesIndex?: number;
}

function SeriesName(props: Props) {
  const { t } = useTranslation();
  const { seriesIndex = 1 } = props;
  const defaultName = props.name;
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(defaultName);
  const ref = useRef<any>(null);

  const write = ({ target: { value } }) => {
    setName(value);
    props.onChange();
  };

  const onBlur = () => {
    setEditing(false);
    const updated = props.onUpdate(name);
    if (!updated) {
      setName(defaultName);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setEditing(false);
      const updated = props.onUpdate(name);
      if (!updated) {
        setName(defaultName);
      }
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
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          className="bg-white text-lg border-transparent rounded-lg font-medium ps-2 input-rename-series"
          maxLength={22}
          size="small"
        />
      ) : (
        <Tooltip title={t('Click to rename')}>
          <div
            className="text-lg font-medium h-8 flex items-center border-transparent p-2 hover:bg-teal/10 cursor-pointer rounded-lg btn-input-rename-series"
            onClick={() => setEditing(true)}
            data-event="input-rename-series"
          >
            {name && name.trim() === '' ? `Series ${seriesIndex + 1}` : name}
          </div>
        </Tooltip>
      )}
    </div>
  );
}

export default SeriesName;
