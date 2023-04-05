import React from 'react';
import { Button, Icon } from 'UI';
import Integrations from '../../../Client/Integrations';

function IntegrationItem({ icon, title, onClick = () => null }) {
  return (
    <div className="flex flex-col items-center mr-16">
      <Icon name={icon} size="40" />
      <div className="mt-1 text-sm">{title}</div>
    </div>
  );
}

function IntegrationsTab() {
  return (
    <>
      <h1 className="flex items-center px-4 py-3 border-b text-2xl">
        <span>🔌</span>
        <div className="ml-3">Integrations</div>
      </h1>
      <div className="p-4">
        <Integrations hideHeader={true} />
      </div>
      {/* <div className="py-6 w-4/12">
        <div className="p-5 bg-gray-lightest mb-4">
          <div className="font-bold mb-2">Why Use Plugins?</div>
          <div className="text-sm">
            Reproduce issues as if they happened in your own browser. Plugins help capture your
            application’s store, HTTP requests, GraphQL queries and more.
          </div>
        </div>

        <div className="p-5 bg-gray-lightest mb-4">
          <div className="font-bold mb-2">Why Use Integrations?</div>
          <div className="text-sm">
            Sync your backend errors with sessions replays and see what happened front-to-back.
          </div>
        </div>
      </div> */}
      <div className="border-t px-4 py-3 flex justify-end">
        <Button variant="primary" className="">
          Identify Users
          <Icon name="arrow-right-short" color="white" size={20} />
        </Button>
      </div>
    </>
  );
}

export default IntegrationsTab;
