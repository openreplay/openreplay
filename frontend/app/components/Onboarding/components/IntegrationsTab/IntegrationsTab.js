import React from 'react'
import { Icon } from 'UI'
import Integrations from '../../../Client/Integrations'

function IntegrationItem({ icon, title, onClick= () => null }) {
  return (
    <div className="flex flex-col items-center mr-16">
      <Icon name={icon} size="40" />
      <div className="mt-1 text-sm">{title}</div>
    </div>
  )
}

function IntegrationsTab() {
  return (
    <div className="flex pt-8 -mx-4">
      <div className="w-8/12 px-4">
        <h1 className="text-3xl font-bold flex items-center mb-4">
          <span>🔌</span>
          <div className="ml-3">Integrations</div>
        </h1>
        <Integrations hideHeader={true} />

        {/* <div className="my-4"/>
        <h1 className="text-3xl font-bold flex items-center mb-4">
          <span>🔌</span>
          <div className="ml-3">Integrations</div>
        </h1>

        <Integrations hideHeader /> */}
        
        {/* <div className="mt-6">
          <div className="font-bold mb-4">How are you handling store management?</div>
          <div className="flex">
            <IntegrationItem icon="vendors/redux" title="Redux" />
            <IntegrationItem icon="vendors/vuex" title="VueX" />
            <IntegrationItem icon="vendors/graphql" title="GraphQL" />
            <IntegrationItem icon="vendors/ngrx" title="NgRx" />
          </div>
        </div>

        <div className="divider" />

        <div className="mt-6">
          <div className="font-bold mb-4">How are you monitoring errors and crash reporting?</div>
          <div className="flex">
            <IntegrationItem icon="integrations/sentry" title="Sentry" />
            <IntegrationItem icon="integrations/bugsnag" title="Sentry" />
            <IntegrationItem icon="integrations/rollbar" title="Sentry" />
            <IntegrationItem icon="integrations/elasticsearch" title="Sentry" />
          </div>
        </div>

        <div className="divider" />

        <div className="mt-6">
          <div className="font-bold mb-4">How are you logging backend errors?</div>
          <div className="flex">
            <IntegrationItem icon="integrations/datadog" title="Datadog" />
            <IntegrationItem icon="integrations/sumologic" title="Sumo Logic" />
            <IntegrationItem icon="integrations/stackdriver" title="Stackdriver" />
            <IntegrationItem icon="integrations/cloudwatch" title="CloudWatch" />
            <IntegrationItem icon="integrations/newrelic" title="New Relic" />
          </div>
        </div>

        <div className="my-4" /> */}
      </div>
      <div className="py-6 w-4/12">
        <div className="p-5 bg-gray-lightest mb-4">
          <div className="font-bold mb-2">Why Use Plugins?</div>
          <div className="text-sm">Reproduce issues as if they happened in your own browser. Plugins help capture your application’s store, HTTP requests, GraphQL queries and more.</div>
        </div>

        <div className="p-5 bg-gray-lightest mb-4">
          <div className="font-bold mb-2">Why Use Integrations?</div>
          <div className="text-sm">Sync your backend errors with sessions replays and see what happened front-to-back.</div>
        </div>
      </div>
    </div>
  )
}

export default IntegrationsTab
