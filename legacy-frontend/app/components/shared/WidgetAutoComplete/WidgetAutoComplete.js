import React, { useState } from 'react';
import { Icon, CircularLoader, Button } from 'UI';
import cn from 'classnames';
import stl from './widgetAutoComplete.module.css';
import { debounce } from 'App/utils';

const WidgetAutoComplete = props => {
  const { className, placeholder = "Search for Resource", itemStyle = {}, filterParams = {} } = props;
  const [selected, setSelected] = useState(null)
  const [focused, setFocused] = useState(props.autoFocus)

  const fetchOptions = debounce(props.fetchOptions, 300)

  const handleChange = ({ target: { name, value } }) => {
    fetchOptions({ ...filterParams, q: value });
  }

  const onSelected = opt => {
    setSelected(opt);
    props.onSelect(opt);
  }

  const onItemClick = (e, { name, value }) => {
    props.onSelect({ url: value });
    setSelected(value);
  }

  const onClearHandle = (e) => {
    e.preventDefault();
    e.stopPropagation();

    setSelected(null);
    props.onSelect({});
  }
 
  return (
    <div className={ cn("flex items-center relative", className)}>
      <div
        className={cn(stl.searchWrapper, 'flex items-center relative', { 'bg-gray-light' : focused })}
        onClick={() => !focused && setFocused(true)}
      >
        { !focused && selected && (
          <div className={cn(stl.selected, 'flex items-center justify-between')}>
            <span>{selected.value}</span>
            <Button varient="text" onClick={onClearHandle}><Icon name="close" size="14"/></Button>
          </div>
        )}
        { (focused || !selected) && (
          <input
            autoFocus={focused}
            type="text"
            className={cn(
              stl.search, 
              'absolute inset-0 w-full py-2 active:outline-none focus:outline-none mr-2',
              { 'focused': focused }
            )}
            placeholder={placeholder}
            onChange={handleChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
        )}
        <div className="absolute right-0 mr-2">
          { props.loading && <CircularLoader loading={ true } /> }
        </div>
      </div>
      { focused && props.options.length > 0 && (
        <div className={cn(stl.menuWrapper, 'absolute top-10 left-0 rounded bg-white')}>
        {
          props.options.map(opt => (
            <div
              className={cn(stl.optionItem)}
              onMouseDown={() => onSelected(opt)}
              style={itemStyle}
            >
              {opt.text || opt.value}
            </div>
          ))
        }
      </div>
      )}
    </div>
  )
}

export default WidgetAutoComplete
