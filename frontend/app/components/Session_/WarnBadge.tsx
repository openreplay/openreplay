import React from 'react';
import { Alert } from 'antd';
import { Icon } from 'UI';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight, X } from 'lucide-react';

const localhostWarn = (project: string) => `${project}_localhost_warn`;

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
  currentVersion: string,
): number {
  if (!suppliedVersion || !currentVersion) return VersionComparison.Same;
  const v1 = parseVersion(suppliedVersion);
  const v2 = parseVersion(currentVersion);

  if (v1[0] < v2[0]) return VersionComparison.Lower;
  if (v1[0] > v2[0]) return VersionComparison.Higher;

  return VersionComparison.Same;
}

// New optional override props added in WarnBadgeExtraProps
interface WarnBadgeExtraProps {
  containerStyle?: React.CSSProperties;
  containerClassName?: string;
  localhostWarnStyle?: React.CSSProperties;
  localhostWarnClassName?: string;
  trackerWarnStyle?: React.CSSProperties;
  trackerWarnClassName?: string;
}

const WarnBadge = React.memo(
  ({
    currentLocation,
    version,
    siteId,
    containerStyle,
    containerClassName,
    localhostWarnStyle,
    localhostWarnClassName,
    trackerWarnStyle,
    trackerWarnClassName,
  }: {
    currentLocation: string;
    version: string;
    siteId: string;
  } & WarnBadgeExtraProps) => {
    const { t } = useTranslation();
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

    // Default container styles and classes
    const defaultContainerStyle: React.CSSProperties = {
      zIndex: 999,
      position: 'absolute',
      left: '50%',
      bottom: '0',
      transform: 'translate(-50%, 80%)',
      fontWeight: 500,
    };
    const defaultContainerClass = "flex flex-col gap-2";
    const defaultWarnClass = "px-3 py-.5 border border-gray-lighter shadow-sm rounded bg-active-blue flex items-center justify-between";

    // Merge defaults with any overrides
    const mergedContainerStyle = { ...defaultContainerStyle, ...containerStyle };
    const mergedContainerClassName = containerClassName
      ? defaultContainerClass + ' ' + containerClassName
      : defaultContainerClass;
    const mergedLocalhostWarnClassName = localhostWarnClassName
      ? defaultWarnClass + ' ' + localhostWarnClassName
      : defaultWarnClass;
    const mergedTrackerWarnClassName = trackerWarnClassName
      ? defaultWarnClass + ' ' + trackerWarnClassName
      : defaultWarnClass;

    return (
      <div
        className={mergedContainerClassName}
        style={mergedContainerStyle}
      >
        {showLocalhostWarn ? (
          <div className={mergedLocalhostWarnClassName} style={localhostWarnStyle}>
            <div>
              <span>{t('Some assets may load incorrectly on localhost.')}</span>
              <a
                href="https://docs.openreplay.com/en/troubleshooting/session-recordings/#testing-in-localhost"
                target="_blank"
                rel="noreferrer"
                className="link ml-1"
              >
                {t('Learn More')}
              </a>
            </div>

            <div
              className="py-1 ml-3 cursor-pointer"
              onClick={() => closeWarning(1)}
            >
              <Icon name="close" size={16} color="black" />
            </div>
          </div>
        ) : null}
        {showTrackerWarn ? (
          <div className={mergedTrackerWarnClassName} style={trackerWarnStyle}>
            <div className='flex gap-x-2 flex-wrap'>
              <div className='font-normal'>
                {t('Tracker version')} <span className='mx-1 font-semibold'>{version}</span>
                {t('for this recording is')}{' '}
                {trackerVerDiff === VersionComparison.Lower
                  ? 'lower '
                  : 'ahead of '}
                {t('the current')}<span className='mx-1 font-semibold'>{trackerVersion}</span>{t('version')}.
              </div>
              <div className='flex gap-1 items-center font-normal'>
                <span>{t('Some recording might display incorrectly.')}</span>
                <a
                  href="https://docs.openreplay.com/en/deployment/upgrade/#tracker-compatibility"
                  target="_blank"
                  rel="noreferrer"
                  className="link ml-1 flex gap-1 items-center"
                >
                  {t('Learn More')} <ArrowUpRight size={12} />
                </a>
              </div>
            </div>

            <div
              className="py-1 ml-3 cursor-pointer"
              onClick={() => closeWarning(2)}
            >
              <X size={18} strokeWidth={1.5}  />
            </div>
          </div>
        ) : null}
      </div>
    );
  },
);

export function PartialSessionBadge() {
  const { t } = useTranslation();
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
      <Alert
        message={t('You are viewing a portion of full session')}
        type="info"
        className="border-0 rounded-lg py-0.5"
        showIcon
      />
    </div>
  );
}

export default WarnBadge;