import React from 'react';
import PlayLink from 'Shared/SessionItem/PlayLink';
import { connect } from 'react-redux';
import { countries } from 'App/constants';
import { session as sessionRoute } from 'App/routes';

interface Props {
  hideModal: () => void;
  session: Record<string, any>;
  width: number;
  height: number;
}

function BugReportModal({ hideModal, session, width, height }: Props) {
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

  console.log(session.toJS())
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
      <Title />
      <MetaInfo envObject={envObject} metadata={metadata} />
      <Session user={userDisplayName} sessionId={sessionId} />
    </div>
  );
}

function Title() {
  return (
    <div className="flex items-center py-2 px-3 justify-between bg-gray-lightest rounded">
      <div className="flex flex-col gap-2">
        <div>Title</div>
        <div className="text-gray-medium">By author</div>
      </div>
      <div>
        <div>Severity</div>
        <div>select here</div>
      </div>
    </div>
  );
}

interface EnvObj {
  Device: string;
  Resolution: string;
  Browser: string;
  OS: string;
  Country: string;
  Rev?: string;
}

function MetaInfo({ envObject, metadata }: { envObject: EnvObj, metadata: Record<string, any> }) {
  return (
    <div className="flex gap-8">
      <div className="flex flex-col gap-2">
        <SectionTitle>Environment</SectionTitle>
        {Object.keys(envObject).map((envTag) => (
          <div className="flex items-center">
            <div className="py-1 px-2">{envTag}</div>
            <div className="py-1 px-2 text-gray-medium bg-light-blue-bg rounded">
              {/* @ts-ignore */}
              {envObject[envTag]}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <SectionTitle>Metadata</SectionTitle>
        {Object.keys(metadata).map((meta) => (
          <div className="flex items-center rounded overflow-hidden bg-gray-lightest">
            <div className="bg-gray-light-shade py-1 px-2">{meta}</div>
            <div className="py-1 px-2 text-gray-medium">{metadata[meta]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Session({ user, sessionId }: { user: string, sessionId: string }) {
  return (
    <div>
      <SectionTitle>Session recording</SectionTitle>
      <div className="border rounded flex items-center justify-between p-2">
        <div className="flex flex-col">
          <div className="text-lg">{user}</div>
          <div className="text-disabled-text">
            {`${window.location.origin}/${window.location.pathname.split('/')[1]}${sessionRoute(sessionId)}`}
          </div>
        </div>
        <PlayLink isAssist={false} viewed={false} sessionId={sessionId} />
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-xl font-semibold mb-2">{children}</div>;
}

const WithUIState = connect((state) => ({ session: state.getIn(['sessions', 'current']) }))(
  BugReportModal
);

export default WithUIState
