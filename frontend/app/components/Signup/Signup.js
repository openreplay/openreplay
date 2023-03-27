import React from 'react';
import withPageTitle from 'HOCs/withPageTitle';
import { Icon } from 'UI';

import stl from './signup.module.css';
import cn from 'classnames';
import SignupForm from './SignupForm';
import RegisterBg from '../../svg/register.svg';
import HealthModal from 'Components/Header/HealthStatus/HealthModal/HealthModal';
import { getHealthRequest } from 'Components/Header/HealthStatus/getHealth';

const BulletItem = ({ text }) => (
  <div className="flex items-center mb-4">
    <div className="mr-3 h-8 w-8 rounded-full bg-white shadow flex items-center justify-center">
      <Icon name="check" size="26" />
    </div>
    <div>{text}</div>
  </div>
);

const healthStatusCheck_key = '__or__healthStatusCheck_key'

@withPageTitle('Signup - OpenReplay')
export default class Signup extends React.Component {
  state = {
    healthModalPassed: localStorage.getItem(healthStatusCheck_key === 'true'),
    healthStatusLoading: true,
    healthStatus: null,
  }

  getHealth = async () => {
    this.setState({ healthStatusLoading: true });
    const { healthMap } = await getHealthRequest();
    this.setState({ healthStatus: healthMap, healthStatusLoading: false });
  }

  componentDidMount() {
    if (!this.state.healthModalPassed) void this.getHealth();
  }

  setHealthModalPassed = () => {
    localStorage.setItem(healthStatusCheck_key, 'true');
    this.setState({ healthModalPassed: true });
  }

  render() {
    if (!this.state.healthModalPassed) {
      return (
          <HealthModal
              setShowModal={() => null}
              healthResponse={this.state.healthStatus}
              getHealth={this.getHealth}
              isLoading={this.state.healthStatusLoading}
              setPassed={this.setHealthModalPassed}
          />
      )
    }

    return (
      <div className="flex justify-center items-center gap-6" style={{ height: '100vh' }}>
        <div className={cn('relative overflow-hidden')}>
          <div className="text-lg flex items-center" style={{ width: '350px'}}>
            <div>
              <div className="flex items-end text-3xl font-bold mb-6">
                <div className="">
                  <img src="/assets/logo.svg" width={200}/>
                </div>{' '}
                <div className="ml-2 text-lg color-gray-medium">
                  Cloud
                </div>
              </div>
              <div className="border-b pb-2 mb-2">OpenReplay Cloud is the hosted version of our <a className="link" href="https://github.com/openreplay/openreplay" target="_blank">open-source</a> project.</div>
              <div>We’ll manage hosting, scaling and upgrades.</div>

              <div className="mt-8">
                <BulletItem text="First 1K sessions free every month." />
                <BulletItem text="Pay per use, cancel anytime" />
                <BulletItem text="Community, Slack & email support" />
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center">
          <div className="">
            <SignupForm />
          </div>
        </div>
      </div>
    );
  }
}
