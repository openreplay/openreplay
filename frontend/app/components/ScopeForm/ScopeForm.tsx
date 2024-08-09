import { ArrowRightOutlined } from '@ant-design/icons';
import { Button, Card, Radio } from 'antd';
import React from 'react';
import { connect } from 'react-redux';
import { upgradeScope, downgradeScope } from "App/duck/user";
import { useHistory } from 'react-router-dom';
import * as routes from 'App/routes'

const Scope = {
  FULL: 'full',
  SPOT: 'spot',
};

function ScopeForm({
  upgradeScope,
  downgradeScope,
}: any) {
  const [scope, setScope] = React.useState(Scope.FULL);
  const history = useHistory();
  const onContinue = (skip?: boolean) => {
    if (skip) {
      upgradeScope();
      history.push(routes.sessions())
    }
    if (scope === Scope.FULL) {
      upgradeScope();
      history.push(routes.sessions())
    } else {
      downgradeScope();
      history.push(routes.spotsList())
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
        <Button type={'text'} onClick={() => onContinue(true)}>
          Skip
        </Button>
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
