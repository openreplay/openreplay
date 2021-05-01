import React from 'react'
import { Dropdown, TagBadge } from 'UI';

const DropdownChips = ({ 
  textFiled = false,
  validate = null,
  placeholder = '',
  selected = [],
  options = [],
  badgeClassName = 'lowercase',
  onChange = () => null,
  ...props
}) => {
  const onRemove = id => {
    onChange(selected.filter(i => i !== id))
  }

  const onSelect = (e, { name, value }) => {
    const newSlected = selected.concat(value);
    onChange(newSlected)
  };

  const onKeyPress = e => {
    const val = e.target.value;
    if (e.key !== 'Enter' || selected.includes(val)) return;
    if (validate && !validate(val)) return;

    const newSlected = selected.concat(val);
    e.target.value = '';
    onChange(newSlected);
    e.preventDefault();
    e.stopPropagation();
  }

  const _options = options.filter(item => !selected.includes(item.value))

  const renderBadge = item => {
    const val = typeof item === 'string' ? item : item.value;
    const text = typeof item === 'string' ? item : item.text;
    return (
      <TagBadge
        className={badgeClassName}
        key={ text }
        text={ text }
        hashed={false}
        onRemove={ () => onRemove(val) }
        outline={ true }
      />
    )
  }

  return (
    <div className="w-full">
      {textFiled ? (
        <input type="text" onKeyPress={onKeyPress} placeholder={placeholder} />
      ) : (
        <Dropdown
          placeholder={placeholder}
          search
          selection
          options={ _options }
          name="webhookInput"
          value={ '' }
          onChange={ onSelect }
          {...props}
        />
      )}
      <div className="flex flex-wrap mt-3">
        {
          textFiled ? 
            selected.map(renderBadge) :
            options.filter(i => selected.includes(i.value)).map(renderBadge)
        }
      </div>
    </div>
  )
}

export default DropdownChips
