import React, { Component, ReactNode, FunctionComponent, useEffect } from 'react';
import Select from 'Shared/Select'
import { components } from 'react-select';
import { Icon } from 'UI';
import FunnelIssuesSelectedFilters from '../FunnelIssuesSelectedFilters';
import { useStore } from 'App/mstore';

const options = [
      { value: "click_rage", label: "Click Rage" },
      { value: "dead_click", label: "Dead Click" },
      { value: "excessive_scrolling", label: "Excessive Scrolling" },
      { value: "bad_request", label: "Bad Request" },
      { value: "missing_resource", label: "Missing Image" },
      { value: "memory", label: "High Memory Usage" },
      { value: "cpu", label: "High CPU" },
      { value: "slow_resource", label: "Slow Resource" },
      { value: "slow_page_load", label: "Slow Page" },
      { value: "crash", label: "Crash" },
      { value: "custom_event_error", label: "Custom Error" },
      { value: "js_error", label: "Error" }
]

function FunnelIssuesDropdown(props) {
    const { funnelStore } = useStore();
    const [isOpen, setIsOpen] = React.useState(false);
    const [selectedValues, setSelectedValues] = React.useState<any>([]);
    const filteredOptions = options.filter((option: any) => {
        return !selectedValues.includes(option.value);
    });

    const selectedOptions = options.filter((option: any) => {
        return selectedValues.includes(option.value);
    });

    useEffect(() => {
        funnelStore.updateKey('issuesFilter', selectedOptions);
    }, [selectedOptions]);

    const handleChange = ({ value }: any) => {
        toggleSelectedValue(value);
    }

    const toggleSelectedValue = (value: string) => {
        if (selectedValues.includes(value)) {
            setSelectedValues(selectedValues.filter(v => v !== value));
        } else {
            setSelectedValues([...selectedValues, value]);
        }
    }

    return (
        <div className="flex items-start">
            <Select
                menuIsOpen={isOpen}
                onMenuOpen={() => setIsOpen(true)}
                onMenuClose={() => setIsOpen(false)}
                options={filteredOptions}
                onChange={handleChange}
                styles={{
                    control: (provided) => ({
                        ...provided,
                        border: 'none',
                        boxShadow: 'none',
                        backgroundColor: 'transparent',
                        minHeight: 'unset',
                    }),
                    menuList: (provided) => ({
                        ...provided,
                        padding: 0,
                        minWidth: '190px',
                    }),
                }}
                components={{
                    ValueContainer: () => null,
                    DropdownIndicator: () => null,
                    IndicatorSeparator: () => null,
                    IndicatorsContainer: () => null,
                    Control: ({ children, ...props }: any) => (
                        <components.Control {...props}>
                        { children }
                        <button className="px-2 py-1 bg-white rounded-2xl border border-teal border-dashed color-teal flex items-center hover:bg-active-blue" onClick={() => setIsOpen(!isOpen)}>
                            <Icon name="funnel" size={16} color="teal" />
                            <span className="ml-2">Issues</span>
                        </button>
                        </components.Control>
                    ),
                    Placeholder: () => null,
                    SingleValue: () => null,
                }}
            />
            <FunnelIssuesSelectedFilters removeSelectedValue={toggleSelectedValue} />
        </div>
    );
}

export default FunnelIssuesDropdown;