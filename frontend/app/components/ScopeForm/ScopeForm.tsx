import { ArrowRightOutlined } from '@ant-design/icons';
import { Button, Card, Radio } from 'antd';
import React from 'react';
import { connect } from 'react-redux';
import { upgradeScope, downgradeScope } from "App/duck/user";
import { useHistory } from 'react-router-dom';
import * as routes from 'App/routes'
import { SPOT_ONBOARDING } from "../../constants/storageKeys";

const Scope = {
  FULL: 'full',
  SPOT: 'spot',
};

function ScopeForm({
  upgradeScope,
  downgradeScope,
}: any) {
  const [scope, setScope] = React.useState(Scope.FULL);
  React.useEffect(() => {
    const isSpotSetup = localStorage.getItem(SPOT_ONBOARDING)
    if (isSpotSetup) {
      setScope(Scope.SPOT)
      localStorage.removeItem(SPOT_ONBOARDING)
    }
  }, [])
  const history = useHistory();
  const onContinue = () => {
    if (scope === Scope.FULL) {
      upgradeScope();
      history.replace(routes.onboarding())
    } else {
      downgradeScope();
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
          Session Replay & Debugging, Customer Support and more
        </Radio>
        <Radio value={'spot'}>Report bugs via Spot</Radio>
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

export default connect(null, { upgradeScope, downgradeScope })(ScopeForm);
