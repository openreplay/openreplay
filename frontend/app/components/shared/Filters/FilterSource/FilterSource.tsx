import { FilterType } from 'App/types/filter/filterType';
import React, { useState, useEffect } from 'react';
import stl from './FilterSource.module.css';
import { debounce } from 'App/utils';
import cn from 'classnames';

interface Props {
    filter: any;
    onUpdate: (filter: any) => void;
}
function FilterSource(props: Props) {
    const { filter } = props;
    const [value, setValue] = useState(filter.source[0] || '');
    const debounceUpdate: any = React.useCallback(debounce(props.onUpdate, 1000), [props.onUpdate]);

    useEffect(() => {
        setValue(filter.source[0] || '');
    }, [filter]);

    useEffect(() => {
        debounceUpdate({ ...filter, source: [value] });
    }, [value]);

    const write = ({ target: { value, name } }: any) => setValue(value);

    const renderFiled = () => {
        switch (filter.sourceType) {
            case FilterType.NUMBER:
                return (
                    <div className="relative">
                        <input name="source" placeholder={filter.sourcePlaceholder} className={cn(stl.inputField, "rounded-l px-1 block")} value={value} onBlur={write} onChange={write} type="number" />
                        <div className="absolute right-0 top-0 bottom-0 bg-gray-lightest rounded-r px-1 border-l border-color-gray-light flex items-center" style={{ margin: '1px', minWidth: '24px'}}>{filter.sourceUnit}</div>
                    </div>
                );
        }
    };

    return <div>{renderFiled()}</div>;
}

export default FilterSource;
