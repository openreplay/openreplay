import React from 'react';
import JsonViewer from './components/JsonViewer';
import Sentry from './components/Sentry';
import { OPENREPLAY, SENTRY, DATADOG, STACKDRIVER } from 'Types/session/stackEvent';

interface Props {
    event: any;
}
function StackEventModal(props: Props) {
    const renderPopupContent = () => {
        const {
            event: { source, payload, name },
        } = props;
        switch (source) {
            case SENTRY:
                return <Sentry event={payload} />;
            case DATADOG:
                return <JsonViewer title={name} data={payload} icon="integrations/datadog" />;
            case STACKDRIVER:
                return <JsonViewer title={name} data={payload} icon="integrations/stackdriver" />;
            default:
                return <JsonViewer title={name} data={payload} icon={`integrations/${source}`} />;
        }
    };
    return (
        <div className="bg-white h-screen overflow-y-auto" style={{ width: '450px' }}>
            {renderPopupContent()}
        </div>
    );
}

export default StackEventModal;
