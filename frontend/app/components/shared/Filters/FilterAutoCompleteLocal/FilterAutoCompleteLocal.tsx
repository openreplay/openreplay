import React, { useState, useEffect } from 'react';
import { Icon } from 'UI';
import stl from './FilterAutoCompleteLocal.module.css';
import { Input } from 'antd';

interface Props {
  showOrButton?: boolean;
  showCloseButton?: boolean;
  onRemoveValue?: (index: number) => void;
  onAddValue?: (index: number) => void;
  placeholder?: string;
  onSelect: (e: any, item: Record<string, any>, index: number) => void;
  value: any;
  icon?: string;
  type?: string;
  isMultiple?: boolean;
  allowDecimals?: boolean;
}

function FilterAutoCompleteLocal(props: Props & { index: number }) {
  const {
    showCloseButton = false,
    placeholder = 'Enter',
    showOrButton = false,
    onRemoveValue = () => null,
    onAddValue = () => null,
    value = '',
    type = 'text',
    isMultiple = true,
    allowDecimals = true,
    index,
  } = props;
  const [query, setQuery] = useState(value);

  const onInputChange = (e) => {
    if (allowDecimals) {
      const value = e.target.value;
      setQuery(value);
      props.onSelect(null, value, index);
    } else {
      const value = e.target.value.replace(/[^\d]/, '');
      if (+value !== 0) {
        setQuery(value);
        props.onSelect(null, value, index);
      }
    }
  };

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      props.onSelect(e, { value: query }, index);
    }
  };

  return (
    <div className="relative flex items-center">
      <div className={stl.wrapper}>
        <Input
          name="query"
          onInput={onInputChange}
          value={query}
          autoFocus={true}
          type={type}
          placeholder={placeholder}
          onKeyDown={handleKeyDown}
        />
        <div className={stl.right}>
          {showCloseButton && (
            <div onClick={() => onRemoveValue(index)}>
              <Icon name="close" size="12" />
            </div>
          )}
          {showOrButton && isMultiple ? (
            <div onClick={() => onAddValue(index)} className="color-teal">
              <span className="px-1">or</span>
            </div>
          ) : null}
        </div>
      </div>

      {!showOrButton && isMultiple ? <div className="ml-2">or</div> : null}
    </div>
  );
}

function FilterLocalController(props: Props) {
  return props.value.map((value, index) => (
    <FilterAutoCompleteLocal
      {...props}
      key={index}
      index={index}
      showOrButton={index === props.value.length - 1}
      showCloseButton={props.value.length > 1}
      value={value}
    />
  ));
}

export default FilterLocalController;
