import React from 'react';
import { DATADOG, SENTRY, STACKDRIVER, typeList } from 'Types/session/stackEvent';
import JsonViewer from 'Components/Session_/StackEvents/UserEvent/JsonViewer';
import Sentry from 'Components/Session_/StackEvents/UserEvent/Sentry';

interface Props {
  event: any;
}
function StackEventModal(props: Props) {
  const { event } = props;
  const renderPopupContent = () => {
    const { source, payload, name } = event;
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
    <div className="bg-white overflow-y-auto h-screen p-5" style={{ width: '500px' }}>
      <h5 className="mb-2 text-2xl">Stack Event</h5>
      {renderPopupContent()}
    </div>
  );
}

export default StackEventModal;
