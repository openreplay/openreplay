import { ArrowRightOutlined } from '@ant-design/icons';
import { Button, Card, Radio } from 'antd';
import React from 'react';
import { useHistory } from 'react-router-dom';
import * as routes from 'App/routes'
import { SPOT_ONBOARDING } from "App/constants/storageKeys";
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';

const Scope = {
  FULL: 'full',
  SPOT: 'spot',
};

function getDefaultSetup() {
  const isSpotSetup = localStorage.getItem(SPOT_ONBOARDING)
  if (isSpotSetup) {
    localStorage.removeItem(SPOT_ONBOARDING)
    return Scope.SPOT
  }
  return Scope.FULL
}

function ScopeForm() {
  const { userStore } = useStore();
  const upgradeScope = userStore.upgradeScope
  const downgradeScope = userStore.downgradeScope
  const scopeState = userStore.scopeState
  const [scope, setScope] = React.useState(getDefaultSetup);
  React.useEffect(() => {
    if (scopeState !== 0) {
      if (scopeState === 2) {
        history.replace(routes.onboarding())
      } else {
        history.replace(routes.spotsList())
      }
    }
  }, [scopeState])

  const history = useHistory();
  const onContinue = () => {
    if (scope === Scope.FULL) {
      void upgradeScope();
      history.replace(routes.onboarding())
    } else {
      void downgradeScope();
      history.replace(routes.spotsList())
    }
  };
  return (
    <div className={'flex items-center justify-center w-screen h-screen'}>
      <Card
        style={{ width: 540 }}
        title={'👋 Welcome to OpenReplay'}
        classNames={{
          header: 'text-2xl font-semibold text-center',
          body: 'flex flex-col gap-2',
        }}
      >
        <div className={'font-semibold'}>
          How will you primarily use OpenReplay?{' '}
        </div>
        <div className={'text-disabled-text'}>
          <div>
            You will have access to all OpenReplay features regardless of your
            choice.
          </div>
          <div>
            Your preference will simply help us tailor your onboarding experience.
          </div>
        </div>
        <Radio.Group
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          className={'flex flex-col gap-2 mt-4 '}
        >
          <Radio value={'full'}>
            Session Replay with DevTools, Co-browsing and Product Analytics
          </Radio>
          <Radio value={'spot'}>Bug reporting via Spot</Radio>
        </Radio.Group>

        <div className={'self-end'}>
          <Button
            type={'primary'}
            onClick={() => onContinue()}
            icon={<ArrowRightOutlined />}
            iconPosition={'end'}
          >
            Continue
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default observer(ScopeForm);
