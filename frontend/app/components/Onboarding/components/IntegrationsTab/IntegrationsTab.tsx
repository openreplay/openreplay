import { Button as AntButton } from 'antd';
import React from 'react';

import Integrations from 'App/components/Client/Integrations/Integrations';
import withPageTitle from 'App/components/hocs/withPageTitle';
import { Button, Icon } from 'UI';

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
          <AntButton
            size={'small'}
            type={'text'}
            className="ml-2 flex items-center gap-2"
          >
            <Icon name={'question-circle'} />
            <div className={'text-main'}>See Documentation</div>
          </AntButton>
        </a>
      </h1>
      <Integrations hideHeader={true} />
      <div className="border-t px-4 py-3 flex justify-end">
        <Button
          variant="primary"
          className=""
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
