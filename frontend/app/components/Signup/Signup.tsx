import { Button } from '@/ui/actions/button';
import withPageTitle from 'HOCs/withPageTitle';
import { RefreshCcw } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { login } from 'App/routes';
import { useNavigate } from 'App/routing';
import AuthScreen from 'Components/Auth/AuthScreen';
import {
  HealthLinks,
  HealthReport,
} from 'Components/Header/HealthStatus/HealthReport';
import { getHealthRequest } from 'Components/Header/HealthStatus/getHealth';

import SignupForm from './SignupForm';

const LOGIN_ROUTE = login();

const healthStatusCheck_key = '__or__healthStatusCheck_key';

const Signup: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { userStore } = useStore();
  const { authDetails } = userStore.authStore;
  const [healthModalPassed, setHealthModalPassed] = useState<boolean>(
    localStorage.getItem(healthStatusCheck_key) === 'true',
  );
  const [healthStatusLoading, setHealthStatusLoading] = useState<boolean>(true);
  const [healthStatus, setHealthStatus] = useState<any>(null);

  const getHealth = async () => {
    setHealthStatusLoading(true);
    try {
      const { healthMap } = await getHealthRequest(true);
      setHealthStatus(healthMap);
    } catch (e) {
      console.error(e);
    } finally {
      setHealthStatusLoading(false);
    }
  };

  useEffect(() => {
    if (!authDetails) return;
    if (authDetails) {
      if (authDetails.tenants) {
        navigate(LOGIN_ROUTE);
      } else {
        void getHealth();
      }
    }
  }, [authDetails]);

  if (authDetails && !healthModalPassed && !authDetails.tenants) {
    return (
      <AuthScreen other="signin" step="health">
        <div className="m-auth__form">
          <header className="m-auth__head">
            <h1 className="m-auth__title" id="m-auth-title">
              {t('Check your installation')}
            </h1>
            <p className="m-auth__lede">
              {healthStatus?.overallHealth
                ? t('Every service answered. You can create the first account.')
                : t(
                    'Every service has to answer before the first account can be created.',
                  )}
            </p>
          </header>
          <div className="m-auth__fields">
            <HealthReport report={healthStatus} loading={healthStatusLoading} />
            <div className="flex items-center gap-3">
              <Button
                size="md"
                disabled={healthStatusLoading}
                onClick={() => void getHealth()}
              >
                <RefreshCcw
                  size={13}
                  className={healthStatusLoading ? 'animate-spin' : ''}
                />
                {t('Recheck')}
              </Button>
              <Button
                variant="primary"
                size="md"
                className="flex-1"
                disabled={!healthStatus?.overallHealth || healthStatusLoading}
                onClick={() => setHealthModalPassed(true)}
              >
                {t('Continue')}
              </Button>
            </div>
            <HealthLinks />
          </div>
        </div>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen other="signin" step="form">
      <SignupForm />
    </AuthScreen>
  );
};

export default withPageTitle('Signup - OpenReplay')(observer(Signup));
