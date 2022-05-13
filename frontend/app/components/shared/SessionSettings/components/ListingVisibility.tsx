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
    const [changed, setChanged] = React.useState(false);
    const { settingsStore } = useStore();
    const sessionSettings = useObserver(() => settingsStore.sessionSettings)
    const [durationSettings, setDurationSettings] = React.useState(sessionSettings.durationFilter);

    return (
        <>
            <h3 className="text-lg">Listing Visibility</h3>
            <div className="my-1">Do not show sessions duration with.</div>
            <div className="grid grid-cols-12 gap-2 mt-2">
                <div className="col-span-4">
                    <Select
                        options={numberOptions}
                        defaultValue={numberOptions[0].value}
                        onChange={({ value }) => {
                            setDurationSettings({ ...durationSettings, operator: value });
                            setChanged(true);
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
                            setDurationSettings({ ...durationSettings, count: value });
                            setChanged(true);
                        }}
                    />
                </div>
                <div className="col-span-3">
                    <Select
                        defaultValue={periodOptions[1].value}
                        options={periodOptions}
                        onChange={({ value }) => {
                            setDurationSettings({ ...durationSettings, countType: value });
                            setChanged(true);
                        }}
                    />
                </div>
                <div className="col-span-3">
                    <Button outline size="medium" disabled={!changed} onClick={() => {
                        sessionSettings.updateKey('durationFilter', durationSettings);
                        setChanged(false);
                    }}>Update</Button>
                </div>
            </div>
        </>
    );
}

export default ListingVisibility;
