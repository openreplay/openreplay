import React, { useEffect, useState } from 'react';
import { CloseCircleFilled } from '@ant-design/icons';
import { Button, Input } from 'antd';

import { debounce } from 'App/utils';

function FilterNumericalInput({
  filter,
  onUpdate,
}: {
  filter: any;
  onUpdate: (filter: any) => void;
}) {
  const initialValues: string[] = Array.isArray(filter.value)
    ? filter.value
    : filter.value
      ? [filter.value]
      : [''];

  const [localValues, setLocalValues] = useState<string[]>(initialValues);

  useEffect(() => {
    setLocalValues(initialValues);
  }, [filter.value]);

  const debouncedUpdate = React.useRef(
    debounce((updated: any) => {
      onUpdate(updated);
    }, 250),
  ).current;

  const handleChange = (index: number, newValue: string) => {
    const next = [...localValues];
    next[index] = newValue;
    setLocalValues(next);
    debouncedUpdate({ ...filter, value: next });
  };

  const handleAdd = () => {
    const next = [...localValues, ''];
    setLocalValues(next);
  };

  const handleRemove = (index: number) => {
    const next = localValues.filter((_, i) => i !== index);
    const result = next.length ? next : [''];
    setLocalValues(result);
    onUpdate({ ...filter, value: result });
  };

  useEffect(() => {
    if (localValues.length === 0) {
      handleAdd();
    }
  }, [localValues]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        flexWrap: 'wrap',
      }}
    >
      {localValues.map((val, index) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <span style={{ fontSize: 12, color: '#999' }}>{'or'}</span>
          )}
          <Input
            type="number"
            value={val}
            size="small"
            className="rounded-lg"
            style={{
              width: `clamp(80px, ${(val?.toString().length || 0) + 6}ch, 240px)`,
            }}
            placeholder={filter.placeholder}
            onChange={(e) => handleChange(index, e.target.value)}
            suffix={
              localValues.length > 1 ? (
                <CloseCircleFilled
                  style={{ fontSize: 12, color: '#bbb', cursor: 'pointer' }}
                  onClick={() => handleRemove(index)}
                />
              ) : null
            }
          />
        </React.Fragment>
      ))}
      <Button type="text" size="small" onClick={handleAdd}>
        {'+ or'}
      </Button>
    </div>
  );
}

export default FilterNumericalInput;
