import React from 'react';
import IntegrationModalCard from 'Components/Client/Integrations/IntegrationModalCard';

import DocLink from 'Shared/DocLink/DocLink';

import IntegrationForm from './IntegrationForm';

const ElasticsearchForm = (props) => {
  return (
    <div
      className="bg-white h-screen overflow-y-auto"
      style={{ width: '350px' }}
    >
      <IntegrationModalCard
        title="Elasticsearch"
        icon="integrations/elasticsearch"
        description="Integrate Elasticsearch with session replays to seamlessly observe backend errors."
      />

      <div className="p-5 border-b mb-4">
        <div className="font-medium mb-1">How it works?</div>
        <ol className="list-decimal list-inside">
          <li>Create a new Elastic API key</li>
          <li>Enter the API key below</li>
          <li>Propagate openReplaySessionToken</li>
        </ol>
        <DocLink
          className="mt-4"
          label="Integrate Elasticsearch"
          url="https://docs.openreplay.com/integrations/elastic"
        />
      </div>
      <IntegrationForm
        {...props}
        name="elasticsearch"
        formFields={[
          {
            key: 'host',
            label: 'Host',
          },
          {
            key: 'apiKeyId',
            label: 'API Key ID',
          },
          {
            key: 'apiKey',
            label: 'API Key',
          },
          {
            key: 'indexes',
            label: 'Indexes',
          },
          {
            key: 'port',
            label: 'Port',
            type: 'number',
          },
        ]}
      />
    </div>
  );
};

export default ElasticsearchForm;
