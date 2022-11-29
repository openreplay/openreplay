import React, { useEffect } from 'react';
import Select from 'Shared/Select'
import { components } from 'react-select';
import { Icon } from 'UI';
import FunnelIssuesSelectedFilters from '../FunnelIssuesSelectedFilters';
import { useStore } from 'App/mstore';
import OutsideClickDetectingDiv from 'Shared/OutsideClickDetectingDiv';

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

function FunnelIssuesDropdown() {
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
        toggleSelectedValue(value.value);
    }

    const toggleSelectedValue = (value: string) => {
        if (selectedValues.includes(value)) {
            setSelectedValues(selectedValues.filter(v => v !== value));
        } else {
            setSelectedValues([...selectedValues, value]);
        }
    }

    const onClickOutside = (e: any) => {
        if (e.target.id === 'dd-button') return;
        if (isOpen) {
            setTimeout(() => {
                setIsOpen(false);
            }, 0);
        }
    }

    return (
        <div className="flex items-start">
            <Select
                menuIsOpen={isOpen}
                // onMenuOpen={() => setIsOpen(true)}
                // onMenuClose={() => setIsOpen(false)}
                options={filteredOptions}
                onChange={handleChange}
                styles={{
                    control: (provided: any) => ({
                        ...provided,
                        border: 'none',
                        boxShadow: 'none',
                        backgroundColor: 'transparent',
                        minHeight: 'unset',
                    }),
                    menuList: (provided: any) => ({
                        ...provided,
                        padding: 0,
                        minWidth: '190px',
                    }),
                }}
                components={{
                    ValueContainer: (): any => null,
                    DropdownIndicator: (): any => null,
                    IndicatorSeparator: (): any => null,
                    IndicatorsContainer: (): any => null,
                    Control: ({ children, ...props }: any) => (
                        <OutsideClickDetectingDiv
                            className="relative items-center block"
                            onClickOutside={onClickOutside}
                        >
                            <components.Control {...props}>
                                { children }
                                <button
                                    id="dd-button"
                                    className="px-2 py-1 bg-white rounded-2xl border border-teal border-dashed color-teal flex items-center hover:bg-active-blue select-none"
                                    onClick={() => setIsOpen(!isOpen)}
                                >
                                    <Icon name="funnel" size={16} color="teal" className="pointer-events-none" />
                                    <span className="ml-2 pointer-events-none">Issues</span>
                                </button>
                                
                            </components.Control>
                        </OutsideClickDetectingDiv>
                    ),
                    Placeholder: (): any => null,
                    SingleValue: (): any => null,
                }}
            />
            <FunnelIssuesSelectedFilters removeSelectedValue={toggleSelectedValue} />
        </div>
    );
}

export default FunnelIssuesDropdown;