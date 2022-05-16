import React, { useEffect } from 'react';
import { Icon, Toggler, Button, Input, Loader } from 'UI';
import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';

function CaptureRate(props) {
    const [changed, setChanged] = React.useState(false);
    const { settingsStore } = useStore();
    const sessionSettings = useObserver(() => settingsStore.sessionSettings)
    const loading = useObserver(() => settingsStore.loadingCaptureRate)
    const [captureRate, setCaptureRate] = React.useState(sessionSettings.captureRate);
    const [captureAll, setCaptureAll] = React.useState(sessionSettings.captureAll);

    useEffect(() => {
        settingsStore.fetchCaptureRate().then(() => {
            setCaptureRate(sessionSettings.captureRate);
            setCaptureAll(sessionSettings.captureAll);
        });
    }, [])

    const toggleRate = () => {
            if (captureAll === false) {
                settingsStore.saveCaptureRate({ captureAll: true })
            }
            setCaptureAll(!captureAll)
            setChanged(true)
    }

    return useObserver(() => (
        <Loader loading={loading}>
            <h3 className="text-lg">Recordings</h3>
            <div className="my-1">What percentage of user sessions do you want to Capture?</div>
            <div className="mt-2 mb-4 mr-1 flex items-center">
                <Toggler
                    checked={captureAll}
                    name="test"
                    onChange={toggleRate}
                />
                <span style={{ color: captureAll ? '#000000' : '#999' }}>100%</span>
            </div>
           {!captureAll && (
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
                    <Button
                        disabled={!changed}
                        outline
                        size="medium"
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
    ));
}

export default CaptureRate;
