import Copyright from 'Shared/Copyright';
import React from 'react';
import { Form, Input, Loader, Button, Link, Icon, Message } from 'UI';
import { login as loginRoute } from 'App/routes';
import { connect } from 'react-redux';
import ResetPassword from './ResetPasswordRequest';
import CreatePassword from './CreatePassword';

const LOGIN = loginRoute();

interface Props {
  params: any;
}
function ForgotPassword(props: Props) {
  const { params } = props;
  const pass = params.get('pass');
  const invitation = params.get('invitation');
  const creatingNewPassword = pass && invitation;

  return (
    <div className="flex items-center justify-center h-screen -mt-20">
      <div className="flex flex-col items-center">
        <div className="m-10 ">
          <img src="/assets/logo.svg" width={200} />
        </div>
        <div className="border rounded bg-white" style={{ width: '350px' }}>
          {creatingNewPassword ? (
            <h2 className="text-center text-lg font-medium mb-6 border-b p-5 w-full">
              Welcome, join your organization by creating a new password
            </h2>
          ) : (
            <h2 className="text-center text-2xl font-medium mb-6 border-b p-5 w-full">
              Reset Password
            </h2>
          )}

          <div className="w-full px-8">
            {creatingNewPassword ? <CreatePassword params={params} /> : <ResetPassword />}
          </div>

          <div className="flex flex-col items-center justify-center">
            <div className="my-8">
              <Link to={LOGIN}>
                <div className="link">{'Back to Login'}</div>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Copyright />
    </div>
  );
}

export default connect((state: any, props: any) => ({
  params: new URLSearchParams(props.location.search),
}))(ForgotPassword);
