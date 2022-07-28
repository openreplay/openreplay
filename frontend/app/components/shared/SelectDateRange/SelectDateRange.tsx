import React from 'react';
import { DATE_RANGE_OPTIONS, CUSTOM_RANGE } from 'App/dateRange';
import Select from 'Shared/Select';
import Period, { LAST_7_DAYS } from 'Types/app/period';
import { components } from 'react-select';
import DateRangePopup from 'Shared/DateRangeDropdown/DateRangePopup';
import OutsideClickDetectingDiv from 'Shared/OutsideClickDetectingDiv';
import cn from 'classnames';
import { observer } from 'mobx-react-lite';

interface Props {
    period: any;
    onChange: (data: any) => void;
    disableCustom?: boolean;
    right?: boolean;
    timezone?: string;
    [x: string]: any;
}
function SelectDateRange(props: Props) {
    const [isCustom, setIsCustom] = React.useState(false);
    const { right = false, period, disableCustom = false, timezone, ...rest } = props;
    let selectedValue = DATE_RANGE_OPTIONS.find((obj: any) => obj.value === period.rangeName);
    const options = DATE_RANGE_OPTIONS.filter((obj: any) => (disableCustom ? obj.value !== CUSTOM_RANGE : true));

    const onChange = (value: any) => {
        if (value === CUSTOM_RANGE) {
            setIsCustom(true);
        } else {
            // @ts-ignore
            props.onChange(new Period({ rangeName: value }));
        }
    };

    const onApplyDateRange = (value: any) => {
        // @ts-ignore
        const range = new Period({ rangeName: CUSTOM_RANGE, start: value.start, end: value.end })
        props.onChange(range);
        setIsCustom(false);
    };

    const isCustomRange = period.rangeName === CUSTOM_RANGE;
    const customRange = isCustomRange ? period.rangeFormatted() : '';
    return (
        <div className="relative">
            <Select
                plain
                value={selectedValue}
                options={options}
                onChange={({ value }: any) => onChange(value.value)}
                components={{
                    SingleValue: ({ children, ...props }: any) => {
                        return (
                            <components.SingleValue {...props}>
                                {isCustomRange ? customRange : children}
                            </components.SingleValue>
                        );
                    },
                }}
                period={period}
                right={true}
                style={{ width: '100%' }}
            />
            {isCustom && (
                <OutsideClickDetectingDiv
                    onClickOutside={(e: any) => {
                        if (e.target.parentElement.parentElement.classList.contains('rc-time-picker-panel-select')) {
                            return false;
                        }
                        setIsCustom(false);
                    }}
                >
                    <div
                        className={cn('absolute top-0 mt-10 z-40', { 'right-0': right })}
                        style={{
                            width: '770px',
                        }}
                    >
                        <DateRangePopup timezone={timezone} onApply={onApplyDateRange} onCancel={() => setIsCustom(false)} selectedDateRange={period.range} />
                    </div>
                </OutsideClickDetectingDiv>
            )}
        </div>
    );
}

export default observer(SelectDateRange);
