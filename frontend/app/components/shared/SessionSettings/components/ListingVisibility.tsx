import React from 'react';
import Select from 'Shared/Select';
import { Button, Input } from 'UI';
import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';
import { toast } from 'react-toastify';

const numberOptions = [
    { label: 'Less than', value: '<' },
    { label: 'Greater than', value: '>' },
]
const periodOptions = [
    { label: 'Mins', value: 'min' },
    { label: 'Secs', value: 'sec' },
]

function ListingVisibility(props) {
    const [changed, setChanged] = React.useState(false);
    const { settingsStore } = useStore();
    const sessionSettings = useObserver(() => settingsStore.sessionSettings)
    const [durationSettings, setDurationSettings] = React.useState(sessionSettings.durationFilter);

    const changeSettings = (changes) => {
        setDurationSettings({ ...durationSettings, ...changes });
        setChanged(true);
    }
    const saveSettings = () => {
        sessionSettings.updateKey('durationFilter', durationSettings);
        setChanged(false);
        toast.success("Listing visibility settings saved successfully");
    }

    return (
        <>
            <h3 className="text-lg">Listing Visibility</h3>
            <div className="my-1">Do not show sessions with duration.</div>
            <div className="grid grid-cols-12 gap-2 mt-2">
                <div className="col-span-4">
                    <Select
                        options={numberOptions}
                        defaultValue={numberOptions[0].value}
                        onChange={({ value }) => {
                            changeSettings({ operator: value })
                        }}
                    />
                </div>
                <div className="col-span-2">
                    <Input
                        value={durationSettings.count}
                        type="number"
                        name="count"
                        placeholder="E.g 10"
                        style={{ height: '38px', width: '100%'}}
                        onChange={(e, { value }) => {
                            changeSettings({ count: value })
                        }}
                    />
                </div>
                <div className="col-span-3">
                    <Select
                        defaultValue={periodOptions[1].value}
                        options={periodOptions}
                        onChange={({ value }) => {
                            changeSettings({ countType: value })
                        }}
                    />
                </div>
                <div className="col-span-3">
                    <Button outline size="medium" disabled={!changed} onClick={saveSettings}>Update</Button>
                </div>
            </div>
        </>
    );
}

export default ListingVisibility;
