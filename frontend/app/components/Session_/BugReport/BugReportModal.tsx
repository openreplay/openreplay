import React from 'react';
import { connect } from 'react-redux';
import { countries } from 'App/constants';
import Session from './components/Session'
import MetaInfo from './components/MetaInfo'
import Title from './components/Title'

interface Props {
  hideModal: () => void;
  session: Record<string, any>;
  account: Record<string, any>;
  width: number;
  height: number;
}

function BugReportModal({ hideModal, session, width, height, account }: Props) {
  const {
    userBrowser,
    userDevice,
    userCountry,
    userBrowserVersion,
    userOs,
    userOsVersion,
    userDisplayName,
    userDeviceType,
    revId,
    metadata,
    sessionId,
  } = session;

  console.log(session.toJS(), account.toJS?.())

  const envObject = {
    Device: `${userDevice}${userDeviceType !== userDevice ? ` ${userDeviceType}` : ''}`,
    Resolution: `${width}x${height}`,
    Browser: `${userBrowser} v${userBrowserVersion}`,
    OS: `${userOs} v${userOsVersion}`,
    // @ts-ignore
    Country: countries[userCountry],
  };
  if (revId) {
    Object.assign(envObject, { Rev: revId })
  }
  return (
    <div
      className="flex flex-col p-4 gap-4 bg-white"
      style={{ maxWidth: '70vw', width: 620, height: '100vh' }}
    >
      <Title userName={account.name} />
      <MetaInfo envObject={envObject} metadata={metadata} />
      <Session user={userDisplayName} sessionId={sessionId} />
    </div>
  );
}

// @ts-ignore
const WithUIState = connect((state) => ({ session: state.getIn(['sessions', 'current']), account: state.getIn(['user', 'account']), }))(
  BugReportModal
);

export default WithUIState
