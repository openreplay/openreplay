import React from 'react';
import { Input, TagBadge } from 'UI';
import Select from 'Shared/Select';

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
    const onRemove = (id) => {
        onChange(selected.filter((i) => i !== id));
    };

    const onSelect = ({ value }) => {
        const newSlected = selected.concat(value.value);
        onChange(newSlected);
    };

    const onKeyPress = (e) => {
        const val = e.target.value;
        if (e.key !== 'Enter' || selected.includes(val)) return;
        e.preventDefault();
        e.stopPropagation();
        if (validate && !validate(val)) return;

        const newSlected = selected.concat(val);
        e.target.value = '';
        onChange(newSlected);
    };

    const _options = options.filter((item) => !selected.includes(item.value));

    const renderBadge = (item) => {
        const val = typeof item === 'string' ? item : item.value;
        const text = typeof item === 'string' ? item : item.label;
        return <TagBadge className={badgeClassName} key={text} text={text} hashed={false} onRemove={() => onRemove(val)} outline={true} />;
    };

    return (
        <div className="w-full">
            {textFiled ? (
                <Input type="text" onKeyPress={onKeyPress} placeholder={placeholder} />
            ) : (
                <Select
                    placeholder={placeholder}
                    isSearchable={true}
                    options={_options}
                    name="webhookInput"
                    value={null}
                    onChange={onSelect}
                    {...props}
                />
            )}
            <div className="flex flex-wrap mt-3">
                {textFiled ? selected.map(renderBadge) : options.filter((i) => selected.includes(i.value)).map(renderBadge)}
            </div>
        </div>
    );
};

export default DropdownChips;
