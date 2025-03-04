import React, { useEffect, useState } from 'react';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import { Icon } from 'UI';
import SignupForm from './SignupForm';
import HealthModal from 'Components/Header/HealthStatus/HealthModal/HealthModal';
import { getHealthRequest } from 'Components/Header/HealthStatus/getHealth';
import withPageTitle from 'HOCs/withPageTitle';
import { login } from 'App/routes';
import Copyright from 'Shared/Copyright';

const LOGIN_ROUTE = login();
const BulletItem: React.FC<{ text: string }> = ({ text }) => (
  <div className='flex items-center mb-4'>
    <div className='mr-3 h-8 w-8 rounded-full bg-white shadow flex items-center justify-center'>
      <Icon name='check' size='26' />
    </div>
    <div>{text}</div>
  </div>
);

const healthStatusCheck_key = '__or__healthStatusCheck_key';

type SignupProps = RouteComponentProps;

const Signup: React.FC<SignupProps> = ({ history }) => {
  const { userStore } = useStore();
  const authDetails = userStore.authStore.authDetails;
  const [healthModalPassed, setHealthModalPassed] = useState<boolean>(localStorage.getItem(healthStatusCheck_key) === 'true');
  const [healthStatusLoading, setHealthStatusLoading] = useState<boolean>(true);
  const [healthStatus, setHealthStatus] = useState<any>(null);

  const getHealth = async () => {
    setHealthStatusLoading(true);
    const { healthMap } = await getHealthRequest(true);
    setHealthStatus(healthMap);
    setHealthStatusLoading(false);
  };

  useEffect(() => {
    if (!authDetails)  return
    if (authDetails) {
      if (authDetails.tenants) {
        history.push(LOGIN_ROUTE);
      } else {
        void getHealth();
      }
    }
  }, [authDetails]);

  if (authDetails && !healthModalPassed && !authDetails.tenants) {
    return (
      <HealthModal
        setShowModal={() => null}
        healthResponse={healthStatus}
        getHealth={getHealth}
        isLoading={healthStatusLoading}
        setPassed={() => setHealthModalPassed(true)}
      />
    );
  }

  return (
    <div className='flex justify-center items-center gap-6' style={{ height: '100vh' }}>
      <div className='flex items-center justify-center'>
        <div className=''>
          <SignupForm />
        </div>
      </div>

      <Copyright />
    </div>
  );
};

export default withRouter(withPageTitle('Signup - OpenReplay')(observer(Signup)));
