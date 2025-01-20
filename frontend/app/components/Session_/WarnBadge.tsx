import React from 'react';
import { Alert } from 'antd';
import { Icon } from 'UI';
const localhostWarn = (project: string) => project + '_localhost_warn';

const VersionComparison = {
  Lower: -1,
  Same: 0,
  Higher: 1,
};
function parseVersion(version: string) {
  const cleanVersion = version.split(/[-+]/)[0];
  return cleanVersion.split('.').map(Number);
}

function compareVersions(
  suppliedVersion: string,
  currentVersion: string
): number {
  if (!suppliedVersion || !currentVersion) return VersionComparison.Same;
  const v1 = parseVersion(suppliedVersion);
  const v2 = parseVersion(currentVersion);

  if (v1[0] < v2[0]) return VersionComparison.Lower;
  if (v1[0] > v2[0]) return VersionComparison.Higher;

  return VersionComparison.Same;
}

const WarnBadge = React.memo(
  ({
    currentLocation,
    version,
    siteId,
  }: {
    currentLocation: string;
    version: string;
    siteId: string;
  }) => {
    const localhostWarnSiteKey = localhostWarn(siteId);
    const defaultLocalhostWarn =
      localStorage.getItem(localhostWarnSiteKey) !== '1';
    const localhostWarnActive =
      currentLocation &&
      defaultLocalhostWarn &&
      /(localhost)|(127.0.0.1)|(0.0.0.0)/.test(currentLocation);
    const trackerVersion = window.env.TRACKER_VERSION ?? undefined;
    const trackerVerDiff = compareVersions(version, trackerVersion);
    const trackerWarnActive = trackerVerDiff !== VersionComparison.Same;

    const [showLocalhostWarn, setLocalhostWarn] =
      React.useState(localhostWarnActive);
    const [showTrackerWarn, setTrackerWarn] = React.useState(trackerWarnActive);

    const closeWarning = (type: 1 | 2) => {
      if (type === 1) {
        localStorage.setItem(localhostWarnSiteKey, '1');
        setLocalhostWarn(false);
      }
      if (type === 2) {
        setTrackerWarn(false);
      }
    };

    if (!showLocalhostWarn && !showTrackerWarn) return null;

    return (
      <div
        className="flex flex-col gap-2"
        style={{
          zIndex: 999,
          position: 'absolute',
          left: '50%',
          bottom: '0',
          transform: `translate(-50%, 80%)`,
          fontWeight: 500,
        }}
      >
        {showLocalhostWarn ? (
          <div
            className={
              'px-3 py-1 border border-gray-lighter drop-shadow-md rounded bg-active-blue flex items-center justify-between'
            }
          >
            <div>
              <span>Some assets may load incorrectly on localhost.</span>
              <a
                href="https://docs.openreplay.com/en/troubleshooting/session-recordings/#testing-in-localhost"
                target="_blank"
                rel="noreferrer"
                className="link ml-1"
              >
                Learn More
              </a>
            </div>

            <div className="py-1 ml-3 cursor-pointer" onClick={() => closeWarning(1)}>
              <Icon name="close" size={16} color="black" />
            </div>
          </div>
        ) : null}
        {showTrackerWarn ? (
          <div
            className={
              'px-3 py-1 border border-gray-lighter drop-shadow-md rounded bg-active-blue flex items-center justify-between'
            }
          >
            <div>
              <div>
                Tracker version ({version}) for this recording is{' '}
                {trackerVerDiff === VersionComparison.Lower
                  ? 'lower '
                  : 'ahead of '}
                the current ({trackerVersion}) version.
              </div>
              <div>
                <span>Some recording might display incorrectly.</span>
                <a
                  href={
                    'https://docs.openreplay.com/en/deployment/upgrade/#tracker-compatibility'
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="link ml-1"
                >
                  Learn More
                </a>
              </div>
            </div>

            <div className="py-1 ml-3 cursor-pointer" onClick={() => closeWarning(2)}>
              <Icon name="close" size={16} color="black" />
            </div>
          </div>
        ) : null}
      </div>
    );
  }
);

export function PartialSessionBadge() {
  return (
    <div
      className="flex flex-col gap-2"
      style={{
        zIndex: 999,
        position: 'absolute',
        left: '61%',
        bottom: '1.3rem',
      }}
    >
      <Alert message="You are viewing a portion of full session" type="info" className='border-0 rounded-lg py-0.5' showIcon/>
        
    </div>
  )
}

export default WarnBadge;
