import React, { useEffect, useState } from 'react';
import ErrorFrame from '../ErrorFrame/ErrorFrame';
import { fetchErrorStackList } from 'Duck/sessions';
import { IconButton, Icon } from 'UI';
import { connect } from 'react-redux';

const docLink = 'https://docs.openreplay.com/installation/upload-sourcemaps';

interface Props {
    fetchErrorStackList: any;
    sourcemapUploaded?: boolean;
    errorStack?: any;
    message?: string;
    sessionId: string;
    error: any;
}
function ErrorDetails(props: Props) {
    const { error, sessionId, message = '', errorStack = [], sourcemapUploaded = false } = props;
    const [showRaw, setShowRaw] = useState(false);
    const firstFunc = errorStack.first() && errorStack.first().function;

    const openDocs = () => {
        window.open(docLink, '_blank');
    };

    useEffect(() => {
        props.fetchErrorStackList(sessionId, error.errorId);
    }, []);

    return (
        <div className="bg-white p-5 h-screen" style={{ width: '700px' }}>
            {!sourcemapUploaded && (
                <div
                    style={{ backgroundColor: 'rgba(204, 0, 0, 0.1)' }}
                    className="font-normal flex items-center text-sm font-regular color-red border p-2 rounded"
                >
                    <Icon name="info" size="16" color="red" />
                    <div className="ml-2">
                        Source maps must be uploaded to OpenReplay to be able to see stack traces.{' '}
                        <a href="#" className="color-red font-medium underline" style={{ textDecoration: 'underline' }} onClick={openDocs}>
                            Learn more.
                        </a>
                    </div>
                </div>
            )}
            <div className="flex items-center my-3">
                <h3 className="text-xl mr-auto">Stacktrace</h3>
                <div className="flex justify-end mr-2">
                    <IconButton onClick={() => setShowRaw(false)} label="FULL" plain={!showRaw} primaryText={!showRaw} />
                    <IconButton primaryText={showRaw} onClick={() => setShowRaw(true)} plain={showRaw} label="RAW" />
                </div>
            </div>
            <div className="mb-6 code-font" data-hidden={showRaw}>
                <div className="leading-relaxed font-weight-bold">{error.name}</div>
                <div style={{ wordBreak: 'break-all' }}>{message}</div>
            </div>
            {showRaw && (
                <div className="mb-3 code-font">
                    {error.name} : {firstFunc ? firstFunc : '?'}
                </div>
            )}
            ;
            {errorStack.map((frame: any, i: any) => (
                <div className="mb-3" key={frame.key}>
                    <ErrorFrame frame={frame} showRaw={showRaw} isFirst={i == 0} />
                </div>
            ))}
        </div>
    );
}

ErrorDetails.displayName = 'ErrorDetails';
export default connect(
    (state: any) => ({
        errorStack: state.getIn(['sessions', 'errorStack']),
        sessionId: state.getIn(['sessions', 'current', 'sessionId']),
    }),
    { fetchErrorStackList }
)(ErrorDetails);
