import React, { useState, useEffect } from 'react';
import { Icon } from 'UI';
import stl from './FilterAutoCompleteLocal.module.css';
interface Props {
  showOrButton?: boolean;
  showCloseButton?: boolean;
  onRemoveValue?: () => void;
  onAddValue?: () => void;
  placeholder?: string;
  onSelect: (e, item) => void;
  value: any;
  icon?: string;
  type?: string;
  isMultilple?: boolean;
  allowDecimals?: boolean;
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
      type = "text",
      isMultilple = true,
      allowDecimals = true,
  } = props;
  const [showModal, setShowModal] = useState(true)
  const [query, setQuery] = useState(value);

  const onInputChange = (e) => {
    if(allowDecimals) {
      const value = e.target.value;
      setQuery(value);
      props.onSelect(null, value);
    } else {
      const value = e.target.value.replace(/[^\d]/, "");
      if (+value !== 0) {
        setQuery(value);
        props.onSelect(null, value);
      }
    }
  };

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
          onInput={ onInputChange }
          // onBlur={ onBlur }
          onFocus={ () => setShowModal(true)}
          value={ query }
          autoFocus={ true }
          type={ type }
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

      { !showOrButton && isMultilple && <div className="ml-3">or</div> }
    </div>
  );
}

export default FilterAutoCompleteLocal;