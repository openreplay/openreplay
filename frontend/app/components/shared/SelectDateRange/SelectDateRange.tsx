import React from 'react';
import { DATE_RANGE_OPTIONS, CUSTOM_RANGE } from 'App/dateRange'
import Select from 'Shared/Select';
import Period, { LAST_7_DAYS } from 'Types/app/period';
import { components } from 'react-select';
import DateRangePopup from 'Shared/DateRangeDropdown/DateRangePopup';
import OutsideClickDetectingDiv from 'Shared/OutsideClickDetectingDiv';

interface Props {
    period: any,
    onChange: (data: any) => void;
}
function SelectDateRange(props: Props) {
    const [isCustom, setIsCustom] = React.useState(false);
    const { period } = props;
    const selectedValue = DATE_RANGE_OPTIONS.find(obj => obj.value === period.rangeName)

    const onChange = (value: any) => {
        if (value === CUSTOM_RANGE) {
            setIsCustom(true);
        } else {
            props.onChange(new Period({ rangeName: value }));
        }
    }

    const onApplyDateRange = (value: any) => {
        props.onChange(new Period({ rangeName: CUSTOM_RANGE, start: value.start, end: value.end }));
        setIsCustom(false);
    }

    return (
        <div className="relative">
            <Select
                plain
                value={selectedValue}
                options={DATE_RANGE_OPTIONS}
                onChange={({ value }) => onChange(value)}
                components={{ SingleValue: ({ children, ...props} : any) => {
                    return (
                        <components.SingleValue {...props}>
                            {period.rangeName === CUSTOM_RANGE ? period.rangeFormatted() : children}
                        </components.SingleValue>
                    )
                } }}
                period={period}
            />
            {
            isCustom &&
            <OutsideClickDetectingDiv 
                onClickOutside={() => setIsCustom(false)}
            >
                <div className="absolute top-0 mx-auto mt-10 z-40" style={{ 
                    width: '770px',
                    margin: 'auto 50vh 0',
                    transform: 'translateX(-50%)'
                }}>
                    <DateRangePopup
                        onApply={ onApplyDateRange }
                        onCancel={ () => setIsCustom(false) }
                        selectedDateRange={ period.range }
                    />
                </div>
            </OutsideClickDetectingDiv>
            }
        </div>
    );
}

export default SelectDateRange;

  