import React, { useEffect } from 'react';
import { Toggler, Button } from 'UI';
import Select from 'Shared/Select';
import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';

const timezoneOptions = [
    { label: 'UTC', value: 'UTC' },
    { label: 'EST', value: 'EST' },
]

function DefaultTimezone(props) {
    const [changed, setChanged] = React.useState(false);
    const { settingsStore } = useStore();
    const sessionSettings = useObserver(() => settingsStore.sessionSettings)

    return (
        <>
            <h3 className="text-lg">Default Timezone</h3>
            <div className="my-1">Session Time</div>
            <div className="mt-2 flex items-center" style={{ width: "200px"}}>
                <Select
                    options={timezoneOptions}
                    defaultValue={sessionSettings.timezone}
                    className="w-4/6"
                    onChange={(e, { value }) => {
                        sessionSettings.updateKey('timezone', value);
                        setChanged(true);
                    }}
                />
                <div className="col-span-3 ml-3">
                    <Button disabled={!changed} outline size="medium" onClick={() => {
                        setChanged(false);
                    }}>Update</Button>
                </div>
            </div>
            <div className="text-sm mt-3">This change will impact the timestamp on session card and player.</div>  
        </>
    );
}

export default DefaultTimezone;