import React from 'react';
import { Icon } from 'UI';
import { Button } from 'antd';
import Integrations from 'App/components/Client/Integrations/Integrations';
import withPageTitle from 'App/components/hocs/withPageTitle';

import withOnboarding, { WithOnboardingProps } from '../withOnboarding';

interface Props extends WithOnboardingProps {}
function IntegrationsTab(props: Props) {
  return (
    <>
      <h1 className="flex items-center px-4 py-3 border-b justify-between">
        <div className="flex items-center text-2xl">
          <span>🔌</span>
          <div className="ml-3">Integrations</div>
        </div>

        <a
          href="https://docs.openreplay.com/en/integrations/"
          target="_blank"
        >
          <Button
            size={'small'}
            type={'text'}
            className="ml-2 flex items-center gap-2"
            icon={<Icon name={'question-circle'} />}
          >
            <div className={'text-main'}>See Documentation</div>
          </Button>
        </a>
      </h1>
      <Integrations hideHeader={true} />
      <div className="border-t px-4 py-3 flex justify-end">
        <Button
          type="primary"
          onClick={() => (props.skip ? props.skip() : null)}
        >
          Complete Setup
        </Button>
      </div>
    </>
  );
}

export default withOnboarding(
  withPageTitle('Integrations - OpenReplay')(IntegrationsTab)
);
