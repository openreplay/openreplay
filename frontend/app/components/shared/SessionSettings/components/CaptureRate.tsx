import React from 'react';
import { Icon, Toggler, Button, Input } from 'UI';
import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';

function CaptureRate(props) {
    const [changed, setChanged] = React.useState(false);
    const { settingsStore } = useStore();
    const sessionSettings = useObserver(() => settingsStore.sessionSettings)
    const [captureRate, setCaptureRate] = React.useState(sessionSettings.captureRate);
    const [captureAll, setCaptureAll] = React.useState(captureRate === 100);

    return (
        <>
            <h3 className="text-lg">Capture Rate</h3>
            <div className="my-1">What percentage of your user sessions do you want to record and monitor?</div>
            <div className="mt-2 mb-4">
                <Toggler
                    checked={captureAll}
                    name="test"
                    onChange={() => {
                        setCaptureAll(!captureAll)
                        setChanged(true)
                    }}
                    label="Capture 100% of the sessions"
                />
            </div>
            <div className="flex items-center">
                <div className="relative">
                    <Input
                        type="number"
                        value={captureRate}
                        style={{ height: '38px', width: '100px'}}
                        onChange={(e, { value }) => {
                            setCaptureRate(value)
                            setChanged(true);
                        }}
                        disabled={captureAll}
                        min={0}
                        minValue={0}
                    />
                    <Icon className="absolute right-0 mr-6 top-0 bottom-0 m-auto" name="percent" color="gray-medium" size="18" />
                </div>
                <span className="mx-3">of the sessions</span>
                <Button disabled={!changed} outline size="medium" onClick={settingsStore.updateCaptureRate(captureRate)}>Update</Button>
            </div>
        </>
    );
}

export default CaptureRate;