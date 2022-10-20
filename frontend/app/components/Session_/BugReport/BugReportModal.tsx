import React from 'react';
import { connect } from 'react-redux';
import { countries } from 'App/constants';
import { useStore } from 'App/mstore';
import { session as sessionRoute } from 'App/routes';
import { ReportDefaults, EnvData, Step } from './types'
import Session from './components/Session'
import MetaInfo from './components/MetaInfo'
import Title from './components/Title'
import Comments from './components/Comments'
import Steps from './components/Steps'

interface Props {
  hideModal: () => void;
  session: Record<string, any>;
  account: Record<string, any>;
  width: number;
  height: number;
}

const TYPES = { CLICKRAGE: 'CLICKRAGE', CLICK: 'CLICK', LOCATION: 'LOCATION' }

function mapEvents(events: Record<string,any>[]): Step[] {
  const steps: Step[] = []
  events.forEach(event => {
    if (event.type === TYPES.LOCATION) {
      const step = {
        key: event.key,
        type: TYPES.LOCATION,
        icon: 'pointer',
        details: event.url,
        time: event.time,
      }
      steps.push(step)
    }
    if (event.type === TYPES.CLICK) {
      const step = {
        key: event.key,
        type: TYPES.CLICK,
        icon: 'finger',
        details: event.label,
        time: event.time,
      }
      steps.push(step)
    }
    if (event.type === TYPES.CLICKRAGE) {
      const step = {
        key: event.key,
        type: TYPES.CLICKRAGE,
        icon: 'smile',
        details: event.label,
        time: event.time,
      }
      steps.push(step)
    }
  })

  return steps
}

function BugReportModal({ hideModal, session, width, height, account }: Props) {
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
  bugReportStore.setSteps(mapEvents(events))
  return (
    <div
      className="flex flex-col p-4 gap-4 bg-white overflow-y-scroll"
      style={{ maxWidth: '70vw', width: 620, height: '100vh' }}
    >
      <Title userName={account.name} />
      <MetaInfo envObject={envObject} metadata={metadata} />
      <Steps />
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
