import React from 'react';
import { Button } from 'UI';
import Integrations from 'App/components/Client/Integrations/Integrations';
import withOnboarding, { WithOnboardingProps } from '../withOnboarding';
import withPageTitle from 'App/components/hocs/withPageTitle';

interface Props extends WithOnboardingProps {}
function IntegrationsTab(props: Props) {
  return (
    <>
      <h1 className="flex items-center px-4 py-3 border-b justify-between">
        <div className="flex items-center text-2xl">
          <span>🔌</span>
          <div className="ml-3">Integrations</div>
        </div>

        <a href="https://docs.openreplay.com/en/v1.10.0/integrations/" target="_blank">
          <Button variant="text-primary" icon="question-circle" className="ml-2">
            See Documentation
          </Button>
        </a>
      </h1>
      <Integrations hideHeader={true} />
      <div className="border-t px-4 py-3 flex justify-end">
        <Button variant="primary" className="" onClick={() => (props.skip ? props.skip() : null)}>
          Complete Setup
        </Button>
      </div>
    </>
  );
}

export default withOnboarding(withPageTitle("Integrations - OpenReplay")(IntegrationsTab));
