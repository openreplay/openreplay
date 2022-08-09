import React from 'react';
import { connect } from 'react-redux';
import IntegrationForm from './IntegrationForm';
import { withRequest } from 'HOCs';
import { edit } from 'Duck/integrations/actions';
import DocLink from 'Shared/DocLink/DocLink';

@connect(
    (state) => ({
        config: state.getIn(['elasticsearch', 'instance']),
    }),
    { edit }
)
@withRequest({
    dataName: 'isValid',
    initialData: false,
    dataWrapper: (data) => data.state,
    requestName: 'validateConfig',
    endpoint: '/integrations/elasticsearch/test',
    method: 'POST',
})
export default class ElasticsearchForm extends React.PureComponent {
    componentWillReceiveProps(newProps) {
        const {
            config: { host, port, apiKeyId, apiKey },
        } = this.props;
        const { loading, config } = newProps;
        const valuesChanged = host !== config.host || port !== config.port || apiKeyId !== config.apiKeyId || apiKey !== config.apiKey;
        if (!loading && valuesChanged && newProps.config.validateKeys() && newProps) {
            this.validateConfig(newProps);
        }
    }

    validateConfig = (newProps) => {
        const { config } = newProps;
        this.props
            .validateConfig({
                host: config.host,
                port: config.port,
                apiKeyId: config.apiKeyId,
                apiKey: config.apiKey,
            })
            .then((res) => {
                const { isValid } = this.props;
                this.props.edit('elasticsearch', { isValid: isValid });
            });
    };

    render() {
        const props = this.props;
        return (
            <div className="bg-white h-screen overflow-y-auto" style={{ width: '350px' }}>
                <h3 className="p-5 text-2xl">Elasticsearch</h3>
                <div className="p-5 border-b mb-4">
                    <div>How to integrate Elasticsearch with OpenReplay and see backend errors alongside session recordings.</div>
                    <DocLink className="mt-4" label="Integrate Elasticsearch" url="https://docs.openreplay.com/integrations/elastic" />
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
    }
}
