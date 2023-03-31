import React from 'react';
import withPageTitle from 'HOCs/withPageTitle';
import { Icon } from 'UI';

import { connect } from 'react-redux';
import cn from 'classnames';
import SignupForm from './SignupForm';
import RegisterBg from '../../svg/register.svg';
import HealthModal from 'Components/Header/HealthStatus/HealthModal/HealthModal';
import { getHealthRequest } from 'Components/Header/HealthStatus/getHealth';
import { login } from 'App/routes';
import { withRouter } from 'react-router-dom';
import { fetchTenants } from 'Duck/user';

const LOGIN_ROUTE = login();
const BulletItem = ({ text }) => (
  <div className="flex items-center mb-4">
    <div className="mr-3 h-8 w-8 rounded-full bg-white shadow flex items-center justify-center">
      <Icon name="check" size="26" />
    </div>
    <div>{text}</div>
  </div>
);

const healthStatusCheck_key = '__or__healthStatusCheck_key'

@connect(
  (state, props) => ({
    loading: state.getIn(['user', 'loginRequest', 'loading']),
    authDetails: state.getIn(['user', 'authDetails']),
  }), { fetchTenants }
)
@withPageTitle('Signup - OpenReplay')
@withRouter
export default class Signup extends React.Component {
  state = {
    healthModalPassed: localStorage.getItem(healthStatusCheck_key === 'true'),
    healthStatusLoading: true,
    healthStatus: null,
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    const { authDetails } = nextProps;
    if (Object.keys(authDetails).length === 0) {
      return null;
    }

    if (authDetails.tenants) {
      nextProps.history.push(LOGIN_ROUTE);
    }

    return null;
  }

  getHealth = async () => {
    this.setState({ healthStatusLoading: true });
    const { healthMap } = await getHealthRequest(true);
    this.setState({ healthStatus: healthMap, healthStatusLoading: false });
  }

  componentDidMount() {
    if (!this.state.healthModalPassed) void this.getHealth();

    const { authDetails } = this.props;
    if (Object.keys(authDetails).length === 0) {
      this.props.fetchTenants();
    }
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
        {/* <div className={cn('relative overflow-hidden')}>
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
        </div> */}
        <div className="flex items-center justify-center">
          <div className="">
            <SignupForm />
          </div>
        </div>
      </div>
    );
  }
}
