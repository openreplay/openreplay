import React, { useEffect } from 'react';
import { Toggler, Button } from 'UI';
import Select from 'Shared/Select';
import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';

const str = new Date().toString().match(/([A-Z]+[\+-][0-9]+)/)
const d = str && str[1] || 'UTC';
const timezoneOptions = [
    { label: d, value: 'local' },
    { label: 'UTC', value: 'UTC' },
]

function DefaultTimezone(props) {
    const [changed, setChanged] = React.useState(false);
    const { settingsStore } = useStore();
    const [timezone, setTimezone] = React.useState(settingsStore.sessionSettings.timezone);
    const sessionSettings = useObserver(() => settingsStore.sessionSettings)

    return (
        <>
            <h3 className="text-lg">Default Timezone</h3>
            <div className="my-1">Session Time</div>
            <div className="mt-2 flex items-center" style={{ width: "220px"}}>
                <Select
                    options={timezoneOptions}
                    defaultValue={timezone}
                    className="w-full"
                    onChange={({ value }) => {
                        setTimezone(value);
                        setChanged(true);
                    }}
                />
                <div className="col-span-3 ml-3">
                    <Button disabled={!changed} outline size="medium" onClick={() => {
                        setChanged(false);
                        sessionSettings.updateKey('timezone', timezone);
                    }}>Update</Button>
                </div>
            </div>
            <div className="text-sm mt-3">This change will impact the timestamp on session card and player.</div>  
        </>
    );
}

export default DefaultTimezone;