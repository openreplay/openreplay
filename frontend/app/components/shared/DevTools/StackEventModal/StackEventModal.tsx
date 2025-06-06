import React from 'react';
import { DATADOG, SENTRY, STACKDRIVER } from 'Types/session/stackEvent';
import JsonViewer from 'Components/Session_/StackEvents/UserEvent/JsonViewer';
import Sentry from 'Components/Session_/StackEvents/UserEvent/Sentry';
import { useTranslation } from 'react-i18next';

interface Props {
  event: any;
}
function StackEventModal(props: Props) {
  const { t } = useTranslation();
  const { event } = props;
  const renderPopupContent = () => {
    const { source, payload, name } = event;
    switch (source) {
      case SENTRY:
        return <Sentry event={payload} />;
      case DATADOG:
        return (
          <JsonViewer title={name} data={payload} icon="integrations/datadog" />
        );
      case STACKDRIVER:
        return (
          <JsonViewer
            title={name}
            data={payload}
            icon="integrations/stackdriver"
          />
        );
      default:
        return (
          <JsonViewer
            title={name}
            data={payload}
            icon={`integrations/${source}`}
          />
        );
    }
  };
  return (
    <div className="bg-white overflow-y-auto h-screen p-5">
      <h5 className="mb-2 text-2xl">{t('Stack Event')}</h5>
      {renderPopupContent()}
    </div>
  );
}

export default StackEventModal;
