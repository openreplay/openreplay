import React from 'react';
import Select from 'Shared/Select';
import { Button, Input } from 'UI';
import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';

const numberOptions = [
    { label: 'Less than', value: '<' },
    { label: 'Greater than', value: '>' },
]
const periodOptions = [
    { label: 'Mins', value: 'min' },
    { label: 'Secs', value: 'sec' },
]

function ListingVisibility(props) {
    const { settingsStore } = useStore();
    const sessionSettings = useObserver(() => settingsStore.sessionSettings)
    const [changed, setChanged] = React.useState(false);
    const [durationSettings, setDurationSettings] = React.useState(sessionSettings.durationFilter);
    
    return (
        <>
            <h3 className="text-lg">Listing Visibility</h3>
            <div className="my-1">Do not show sessions duration with.</div>
            <div className="grid grid-cols-12 gap-2 mt-2">
                <div className="col-span-3">
                    <Select
                        options={numberOptions}
                        defaultValue={durationSettings.operator}
                    />
                </div>
                <div className="col-span-3">
                    <Input
                        value={durationSettings.count}
                        type="number"
                        name="count"
                        style={{ height: '38px', width: '100%'}}
                    />
                </div>
                <div className="col-span-3">
                    <Select
                        defaultValue={durationSettings.countType}
                        options={periodOptions}
                    />
                </div>
                <div className="col-span-3">
                    <Button outline size="medium" disabled={!changed} onClick={() => {
                        setChanged(false);
                    }}>Update</Button>
                </div>
            </div>
        </>
    );
}

export default ListingVisibility;