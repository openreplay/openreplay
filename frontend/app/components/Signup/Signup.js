import React from 'react';
import withPageTitle from 'HOCs/withPageTitle';
import { Icon } from 'UI';

import stl from './signup.module.css';
import cn from 'classnames';
import SignupForm from './SignupForm';
import RegisterBg from '../../svg/register.svg';

const BulletItem = ({ text }) => (
  <div className="flex items-center mb-4">
    <div className="mr-3 h-8 w-8 rounded-full bg-white shadow flex items-center justify-center">
      <Icon name="check" size="26" />
    </div>
    <div>{text}</div>
  </div>
);
@withPageTitle('Signup - OpenReplay')
export default class Signup extends React.Component {
  render() {
    return (
      <div className="flex" style={{ height: '100vh' }}>
        <div className={cn('w-6/12 relative overflow-hidden', stl.left)}>
          <div className="px-6 pt-10">
            <img src="/assets/logo-white.svg" />
          </div>
          <img
            style={{ width: '800px', position: 'absolute', bottom: -100, left: 0 }}
            src={RegisterBg}
          />
          <div className="color-white text-lg flex items-center px-20 pt-32">
            <div>
              <div className="flex items-center text-3xl font-bold mb-6">
                OpenReplay Cloud{' '}
                <div className="ml-2">
                  <Icon name="signup" size="28" color="white" />
                </div>
              </div>
              <div>OpenReplay Cloud is the hosted version of our open-source project.</div>
              <div>We’ll manage hosting, scaling and upgrades.</div>

              <div className="mt-8">
                <BulletItem text="First 1K sessions free every month." />
                <BulletItem text="Pay per use, cancel anytime" />
                <BulletItem text="Community, Slack & email support" />
              </div>
            </div>
          </div>
        </div>
        <div className="w-6/12 flex items-center justify-center">
          <div className="">
            <SignupForm />
          </div>
        </div>
      </div>
    );
  }
}
