import React, { useState, useEffect } from 'react';
import { Icon, Loader } from 'UI';
import APIClient from 'App/api_client';
import { debounce } from 'App/utils';
import stl from './FilterAutoComplete.css';
import cn from 'classnames';

const hiddenStyle = { 
  whiteSpace: 'pre-wrap',
  opacity: 0, position: 'fixed', left: '-3000px'
};

interface Props {
  showOrButton?: boolean;
  showCloseButton?: boolean;
  onRemoveValue?: () => void;
  onAddValue?: () => void;
  endpoint?: string;
  method?: string;
  params?: any;
  headerText?: string;
  placeholder?: string;
  onSelect: (e, item) => void;
  value: any;
  icon?: string;
}

function FilterAutoComplete(props: Props) {
  const {
      showCloseButton = false,
      placeholder = 'Type to search',
      method = 'GET',
      showOrButton = false,
      onRemoveValue = () => null,
      onAddValue = () => null,
      endpoint = '',
      params = {},
      headerText = '',
      value = '',
      icon = null,
  } = props;
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false)
  const [options, setOptions] = useState<any>([]);
  const [query, setQuery] = useState(value);
  
  const requestValues = (q) => {    
    setLoading(true);

    return new APIClient()[method?.toLowerCase()](endpoint, { ...params, q })
    .then(response => response.json())
    .then(({ errors, data }) => {
      if (errors) {
        // this.setError();
      } else {
        setOptions(data);       
      }
    }).finally(() => setLoading(false));
  }

  const debouncedRequestValues = React.useCallback(debounce(requestValues, 300), []);

  const onInputChange = ({ target: { value } }) => {
    setQuery(value);
    if (!showModal) {
      setShowModal(true);
    }

    if (value === '' || value === ' ') {
      return
    }
    debouncedRequestValues(value);
  }

  useEffect(() => {
    setQuery(value);
  }, [value])

  const onBlur = (e) => {
    setTimeout(() => { setShowModal(false) }, 200)
    if (query !== value) {
      props.onSelect(e, { value: query })
    }
  }

  const onItemClick = (e, item) => {
    e.stopPropagation();
    e.preventDefault();

    if (query !== item.value) {
      setQuery(item.value); 
    }

    props.onSelect(e, item);
  }

  return (
    <div className="relative flex items-center">
      <div className={stl.wrapper}>
        <input
          name="query"
          onChange={ onInputChange }
          onBlur={ onBlur }
          value={ query }
          autoFocus={ true }
          type="text"
          placeholder={ placeholder }
          // onPaste={(e) => {
          //   const text = e.clipboardData.getData('Text');
          //   // this.hiddenInput.value = text;
          //   // pasted = true; // to use only the hidden input
          // } }
        />
        <div
          className={stl.right}
        >
          { showCloseButton && <div onClick={onRemoveValue}><Icon name="close" size="12" /></div> }
          { showOrButton && <div onClick={onAddValue} className="color-teal"><span className="px-1">or</span></div> }
        </div>
      </div>

      { !showOrButton && <div className="ml-3">or</div> }

      { showModal && (
        <div className={ stl.menu }>
          <Loader loading={loading} size="small">
            { options.length === 0 ? (
              <div className="p-4 w-full">No results found!</div>
            ) : (
              <div>
                {
                  options.map((item, i) => (
                    <div
                      key={item.value + '_'  + i}
                      className={ cn(stl.filterItem) }
                      id="filter-item" onClick={ (e) => onItemClick(e, item) }
                    >
                      { icon && <Icon name={ icon } size="16" marginRight="8" /> }
                      <span className={ stl.label }>{ item.value }</span>
                    </div>             
                  ))
                }
              </div>
            )} 
          </Loader>
        </div>
      )}
    </div>
  );
}

export default FilterAutoComplete;