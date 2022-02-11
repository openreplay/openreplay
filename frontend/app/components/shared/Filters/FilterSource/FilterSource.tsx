import { FilterType } from 'App/types/filter/filterType';
import React, { useState, useEffect } from 'react';
import stl from './FilterSource.css';

interface Props {
  filter: any,
  onUpdate: (filter) => void;
}
function FilterSource(props: Props) {
  const { filter } = props;
  const [value, setValue] = useState(filter.source[0] || '');

  const onChange = ({ target: { value, name } }) => {
    props.onUpdate({ ...filter, [name]: [value] })
  }

  useEffect(() => {
   setValue(filter.source[0] || '');
  }, [filter])

  useEffect(() => {
    props.onUpdate({ ...filter, source: [value] })
  }, [value])

  const write = ({ target: { value, name } }) => setValue(value)

  const renderFiled = () => {
    switch(filter.sourceType) {
      case FilterType.NUMBER:
        return (
          <input
            name="source"
            className={stl.inputField}
            value={value}
            onBlur={write}
            onChange={write}
            type="number"
          />
        )
    }
  }

  return (
    <div>
      { renderFiled()}
    </div>
  );
}

export default FilterSource;