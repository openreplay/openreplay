import React, { useEffect, useState } from 'react';
import { Icon, Toggler, Button, Input, Loader } from 'UI';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';

function CaptureRate() {
    const { settingsStore } = useStore();
    const [changed, setChanged] = useState(false);
    const [sessionSettings] = useState(settingsStore.sessionSettings)
    const [loading] = useState(settingsStore.loadingCaptureRate)

    const captureRate = sessionSettings.captureRate;
    const setCaptureRate = sessionSettings.changeCaptureRate
    const captureAll = sessionSettings.captureAll
    const setCaptureAll = sessionSettings.changeCaptureAll

    useEffect(() => {
        settingsStore.fetchCaptureRate()
    }, [])

    const changeCaptureRate = (input: string) => {
        setChanged(true);
        setCaptureRate(input);
    }

    const toggleRate = () => {
        const newValue = !captureAll;
        setChanged(true)
        if (newValue === true) { 
            const updateObj = {
                rate:"100",
                captureAll: true,
            }
            settingsStore.saveCaptureRate(updateObj)
        } else {
            setCaptureAll(newValue);
        }
    }

    return (
        <Loader loading={loading}>
            <h3 className="text-lg">Recordings</h3>
            <div className="my-1">The percentage of session you want to capture</div>
            <div className="mt-2 mb-4 mr-1 flex items-center">
                <Toggler
                    checked={captureAll}
                    name="test"
                    onChange={toggleRate}
                />
                <span className="ml-2" style={{ color: captureAll ? '#000000' : '#999' }}>100%</span>
            </div>
           {!captureAll && (
            <div className="flex items-center">
                    <div className="relative">
                        <Input
                            type="number"
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => changeCaptureRate(e.target.value)}
                            value={captureRate.toString()}
                            style={{ height: '38px', width: '100px'}}
                            disabled={captureAll}
                            min={0}
                            max={100}
                        />
                        <Icon className="absolute right-0 mr-6 top-0 bottom-0 m-auto" name="percent" color="gray-medium" size="18" />
                    </div>
                    <span className="mx-3">of the sessions</span>
                    <Button
                        disabled={!changed}
                        variant="outline"
                        onClick={() => settingsStore.saveCaptureRate({
                            rate: captureRate,
                            captureAll,
                        }).finally(() => setChanged(false))}
                    >
                        Update
                    </Button>
                </div>
            )}
        </Loader>
    );
}

export default observer(CaptureRate);
