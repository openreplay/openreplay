import React, { useEffect } from 'react';
import { Button } from 'UI';
import Select from 'Shared/Select';
import { useStore } from 'App/mstore';
import { Timezone } from 'App/mstore/types/sessionSettings';
import { useObserver } from 'mobx-react-lite';
import { toast } from 'react-toastify';

type TimezonesDropdown = Timezone[]

const generateGMTZones = (): TimezonesDropdown => {
    const timezones: TimezonesDropdown = []

    const positiveNumbers = [...Array(12).keys()];
    const negativeNumbers = [...Array(12).keys()].reverse();
    negativeNumbers.pop(); // remove trailing zero since we have one in positive numbers array

    const combinedArray = [...negativeNumbers, ...positiveNumbers];

    for (let i = 0; i < combinedArray.length; i++) {
        let symbol = i < 11 ? '-' : '+';
        let isUTC = i === 11
        let prefix = isUTC ? 'UTC / GMT' : 'GMT';
        let value = String(combinedArray[i]).padStart(2, '0');

        let tz = `${prefix} ${symbol}${String(combinedArray[i]).padStart(2, '0')}:00`

        let dropdownValue = `UTC${symbol}${value}`
        timezones.push({ label: tz, value: isUTC ? 'UTC' : dropdownValue })
    }

    timezones.splice(17, 0, { label: 'GMT +05:30', value: 'UTC+05:30' })
    return timezones
}

const timezoneOptions: TimezonesDropdown = [...generateGMTZones()]

function DefaultTimezone() {
    const [changed, setChanged] = React.useState(false);
    const { settingsStore } = useStore();
    const [timezone, setTimezone] = React.useState(settingsStore.sessionSettings.timezone);
    const sessionSettings = useObserver(() => settingsStore.sessionSettings);

    useEffect(() => {
        if (!timezone) setTimezone({ label: 'Local Timezone', value: 'system' });
    }, []);

    const onSelectChange = ({ value }: { value: Timezone }) => {
        setTimezone(value);
        setChanged(true);
    }
    const onTimezoneSave = () => {
        setChanged(false);
        sessionSettings.updateKey('timezone', timezone);
        toast.success("Default timezone saved successfully");
    }

    return (
        <>
            <h3 className="text-lg">Default Timezone</h3>
            <div className="my-1">Session Time</div>
            <div className="mt-2 flex items-center" style={{ width: "265px" }}>
                <Select
                    options={timezoneOptions}
                    defaultValue={timezone.value}
                    className="w-full"
                    onChange={onSelectChange}
                />
                <div className="col-span-3 ml-3">
                    <Button disabled={!changed} variant="outline" size="medium" onClick={onTimezoneSave}>Update</Button>
                </div>
            </div>
            <div className="text-sm mt-3">This change will impact the timestamp on session card and player.</div>
        </>
    );
}

export default DefaultTimezone;
