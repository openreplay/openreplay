import React, { useState, useEffect } from 'react';
import { Icon, Loader } from 'UI';
// import { debounce } from 'App/utils';
import stl from './FilterAutoCompleteLocal.css';
// import cn from 'classnames';

interface Props {
  showOrButton?: boolean;
  showCloseButton?: boolean;
  onRemoveValue?: () => void;
  onAddValue?: () => void;
  placeholder?: string;
  onSelect: (e, item) => void;
  value: any;
  icon?: string;
}

function FilterAutoCompleteLocal(props: Props) {
  const {
      showCloseButton = false,
      placeholder = 'Enter',
      showOrButton = false,
      onRemoveValue = () => null,
      onAddValue = () => null,
      value = '',
      icon = null,
  } = props;
  const [showModal, setShowModal] = useState(true)
  const [query, setQuery] = useState(value);
  // const debounceOnSelect = debounce(props.onSelect, 500);

  const onInputChange = ({ target: { value } }) => {
    setQuery(value);
    props.onSelect(null, { value });
  }

  useEffect(() => {
    setQuery(value);
  }, [value])

  const onBlur = (e) => {
    setTimeout(() => { setShowModal(false) }, 200)
    props.onSelect(e, { value: query })
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      props.onSelect(e, { value: query })
    }
  }

  return (
    <div className="relative flex items-center">
      <div className={stl.wrapper}>
        <input
          name="query"
          onChange={ onInputChange }
          // onBlur={ onBlur }
          onFocus={ () => setShowModal(true)}
          value={ query }
          autoFocus={ true }
          type="text"
          placeholder={ placeholder }
          onKeyDown={handleKeyDown}
        />
        <div
          className={stl.right}
        >
          { showCloseButton && <div onClick={onRemoveValue}><Icon name="close" size="12" /></div> }
          { showOrButton && <div onClick={onAddValue} className="color-teal"><span className="px-1">or</span></div> }
        </div>
      </div>

      { !showOrButton && <div className="ml-3">or</div> }
    </div>
  );
}

export default FilterAutoCompleteLocal;