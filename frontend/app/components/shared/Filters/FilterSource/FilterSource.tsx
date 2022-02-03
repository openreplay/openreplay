import { FilterType } from 'App/types/filter/filterType';
import React from 'react';
import stl from './FilterSource.css';

interface Props {
  filter: any,
  onUpdate: (filter) => void;
}
function FilterSource(props: Props) {
  const { filter } = props;

  const onChange = ({ target: { value, name } }) => {
    props.onUpdate({ ...filter, [name]: [value] })
  }

  const renderFiled = () => {
    switch(filter.sourceType) {
      case FilterType.NUMBER:
        return (
          <input
            name="source"
            className={stl.inputField}
            value={filter.source[0]}
            onBlur={onChange}
            onChange={onChange}
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