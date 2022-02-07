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
  const [showModal, setShowModal] = useState(true)
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
    // .catch(this.setError);
  }

  const debouncedRequestValues = debounce(requestValues, 1000)

  const onInputChange = ({ target: { value } }) => {
    setQuery(value);
  }

  useEffect(() => {
    if (query === '' || query === ' ') {
      return 
    }

    debouncedRequestValues(query)
  }, [query])

  useEffect(() => {
    if(value === '') {
      setQuery(value);
    }
  }, [value])

  const onBlur = (e) => {
    setTimeout(() => { setShowModal(false) }, 200)
    props.onSelect(e, { value: query })
  }

  const onItemClick = (e, item) => {
    e.stopPropagation();
    e.preventDefault();
    // const { onSelect, name } = this.props;

    
    if (query !== item.value) {
      setQuery(item.value); 
    }
    // this.setState({ query: item.value, ddOpen: false})
    props.onSelect(e, item);
    // setTimeout(() => {
    //   setShowModal(false)
    // }, 10)
  }

  return (
    <div className="relative flex items-center">
      <div className={stl.wrapper}>
        <input
          name="query"
          onChange={ onInputChange }
          onBlur={ onBlur }
          onFocus={ () => setShowModal(true)}
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
          // onClick={showOrButton ? onRemoveValue : onAddValue}
        >
          { showCloseButton && <div onClick={onRemoveValue}><Icon name="close" size="12" /></div> }
          { showOrButton && <div onClick={onAddValue} className="color-teal"><span className="px-1">or</span></div> }
        </div>
      </div>

      { !showOrButton && <div className="ml-3">or</div> }

      {/* <textarea style={hiddenStyle} ref={(ref) => this.hiddenInput = ref }></textarea> */}

      { showModal && (options.length > 0 || loading) &&
        <div className={ stl.menu }>
          { headerText && headerText }
          <Loader loading={loading} size="small">
            {
              options.map(item => (
                <div
                  className={ cn(stl.filterItem) }
                  id="filter-item" onClick={ (e) => onItemClick(e, item) }
                >
                  { icon && <Icon name={ icon } size="16" marginRight="8" /> }
                  <span className={ stl.label }>{ item.value }</span>
                </div>             
              ))
            }
          </Loader>
        </div>
      }
    </div>
  );
}

export default FilterAutoComplete;