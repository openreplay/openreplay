import React, { useEffect, useState } from 'react';
import { Icon, Toggler, Button, Input, Loader, Popup } from 'UI';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { connect } from 'react-redux';
import cn from 'classnames';

function CaptureRate({ isAdmin = false }) {
    const { settingsStore } = useStore();
    const [changed, setChanged] = useState(false);
    const [sessionSettings] = useState(settingsStore.sessionSettings);
    const [loading] = useState(settingsStore.loadingCaptureRate);

    const captureRate = sessionSettings.captureRate;
    const setCaptureRate = sessionSettings.changeCaptureRate;
    const captureAll = sessionSettings.captureAll;
    const setCaptureAll = sessionSettings.changeCaptureAll;

    useEffect(() => {
        settingsStore.fetchCaptureRate();
    }, []);

    const changeCaptureRate = (input: string) => {
        setChanged(true);
        setCaptureRate(input);
    };

    const toggleRate = () => {
        const newValue = !captureAll;
        setChanged(true);
        if (newValue === true) {
            const updateObj = {
                rate: '100',
                captureAll: true,
            };
            settingsStore.saveCaptureRate(updateObj);
        } else {
            setCaptureAll(newValue);
        }
    };

    return (
        <Loader loading={loading}>
            <h3 className="text-lg">Capture Rate</h3>
            <div className="my-1">The percentage of session you want to capture</div>
            <Popup content="You don't have permission to change." disabled={isAdmin} delay={0}>
                <div className={cn('mt-2 mb-4 mr-1 flex items-center', { disabled: !isAdmin })}>
                    <Toggler checked={captureAll} name="test" onChange={toggleRate} />
                    <span className="ml-2" style={{ color: captureAll ? '#000000' : '#999' }}>
                        100%
                    </span>
                </div>
            </Popup>
            {!captureAll && (
                <div className="flex items-center">
                    <Popup content="You don't have permission to change." disabled={isAdmin} delay={0}>
                        <div className={cn("relative", { 'disabled' : !isAdmin })}>
                            <Input
                                type="number"
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => changeCaptureRate(e.target.value)}
                                value={captureRate.toString()}
                                style={{ height: '38px', width: '100px' }}
                                disabled={captureAll}
                                min={0}
                                max={100}
                            />
                            <Icon className="absolute right-0 mr-6 top-0 bottom-0 m-auto" name="percent" color="gray-medium" size="18" />
                        </div>
                    </Popup>
                    <span className="mx-3">of the sessions</span>
                    <Button
                        disabled={!changed}
                        variant="outline"
                        onClick={() =>
                            settingsStore
                                .saveCaptureRate({
                                    rate: captureRate,
                                    captureAll,
                                })
                                .finally(() => setChanged(false))
                        }
                    >
                        Update
                    </Button>
                </div>
            )}
        </Loader>
    );
}

export default connect((state: any) => ({
    isAdmin: state.getIn(['user', 'account', 'admin']) || state.getIn(['user', 'account', 'superAdmin']),
}))(observer(CaptureRate));
