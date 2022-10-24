import React from 'react';
import { connect } from 'react-redux';
import { countries } from 'App/constants';
import { useStore } from 'App/mstore';
import { session as sessionRoute } from 'App/routes';
import { ReportDefaults, EnvData } from './types'
import Session from './components/Session'
import MetaInfo from './components/MetaInfo'
import Title from './components/Title'
import Comments from './components/Comments'
import Steps from './components/Steps'
import { mapEvents } from './utils'

interface Props {
  hideModal: () => void;
  session: Record<string, any>;
  account: Record<string, any>;
  width: number;
  height: number;
  xrayProps: {
    currentLocation: Record<string, any>[];
    resourceList: Record<string, any>[];
    exceptionsList: Record<string, any>[];
    eventsList: Record<string, any>[];
    endTime: number;
  }
}

function BugReportModal({ hideModal, session, width, height, account, xrayProps }: Props) {
  const { bugReportStore } = useStore()
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
    events,
  } = session;

  console.log(session.toJS())

  const envObject: EnvData = {
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
  const sessionUrl = `${window.location.origin}/${window.location.pathname.split('/')[1]}${sessionRoute(sessionId)}`
  const defaults: ReportDefaults = {
    author: account.name,
    env: envObject,
    meta: metadata,
    session: {
      user: userDisplayName,
      id: sessionId,
      url: sessionUrl,
    }
  }

  bugReportStore.updateReportDefaults(defaults)
  bugReportStore.setDefaultSteps(mapEvents(events))

  React.useEffect(() => {
    return () => bugReportStore.clearStore()
  }, [])
  return (
    <div
      className="flex flex-col p-4 gap-4 bg-white overflow-y-scroll"
      style={{ maxWidth: '70vw', width: 620, height: '100vh' }}
    >
      <Title userName={account.name} />
      <MetaInfo envObject={envObject} metadata={metadata} />
      <Steps xrayProps={xrayProps} />
      <Session user={userDisplayName} sessionId={sessionId} sessionUrl={sessionUrl} />
      <Comments />
    </div>
  );
}

// @ts-ignore
const WithUIState = connect((state) => ({ session: state.getIn(['sessions', 'current']), account: state.getIn(['user', 'account']), }))(
  BugReportModal
);

export default WithUIState
