import { Notice } from '@/ui/feedback/Notice';
import ENV from 'env';
import React from 'react';
import { useTranslation } from 'react-i18next';

const localhostWarn = (project: string) => `${project}_localhost_warn`;
const vModeWarn = (project: string) => `${project}_v_mode_warn`;
const trackerVerWarn = (project: string) => `${project}_tracker_ver_warn`;

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

const WARNINGS = {
  LOCALHOST: 0,
  TRACKER_VERSION: 1,
  VIRTUAL_ELS_FAIL: 2,
} as const;

type Warns = [
  localhostWarn: boolean,
  trackerWarn: boolean,
  virtualElsFailWarn: boolean,
];

const DOCS_LOCALHOST =
  'https://docs.openreplay.com/en/troubleshooting/session-recordings/#testing-in-localhost';
const DOCS_TRACKER =
  'https://docs.openreplay.com/en/deployment/upgrade/#tracker-compatibility';

/** Facts about this recording that change how to read it, inside the replay. */
const WarnBadge = React.memo(
  ({
    currentLocation,
    version,
    siteId,
    virtualElsFailed,
    onVMode,
  }: {
    currentLocation: string;
    version: string;
    siteId: string;
    virtualElsFailed: boolean;
    onVMode: () => void;
  }) => {
    const { t } = useTranslation();
    const localhostWarnSiteKey = localhostWarn(siteId);
    const vModeWarnSiteKey = vModeWarn(siteId);
    const trackerVerWarnSiteKey = trackerVerWarn(siteId);
    const vModeWarnActive =
      localStorage.getItem(vModeWarnSiteKey) !== '1' && virtualElsFailed;
    const defaultLocalhostWarn =
      localStorage.getItem(localhostWarnSiteKey) !== '1';
    const localhostWarnActive = Boolean(
      currentLocation &&
      defaultLocalhostWarn &&
      /(localhost)|(127\.0\.0\.1)|(0\.0\.0\.0)/.test(currentLocation),
    );
    const trackerVersion = ENV.TRACKER_VERSION ?? undefined;
    const trackerVerDiff = compareVersions(version, trackerVersion);
    const defaultTrackerVerWarn =
      localStorage.getItem(trackerVerWarnSiteKey) !== '1';
    // a player reads older recordings; a newer tracker may write what it can't
    const trackerWarnActive =
      defaultTrackerVerWarn && trackerVerDiff === VersionComparison.Higher;

    const [warnings, setWarnings] = React.useState<Warns>([
      localhostWarnActive,
      trackerWarnActive,
      vModeWarnActive,
    ]);

    React.useEffect(() => {
      setWarnings([localhostWarnActive, trackerWarnActive, virtualElsFailed]);
    }, [localhostWarnActive, trackerWarnActive, virtualElsFailed]);

    const closeWarning = (type: 0 | 1 | 2) => {
      if (type === WARNINGS.LOCALHOST) {
        localStorage.setItem(localhostWarnSiteKey, '1');
      }
      if (type === WARNINGS.TRACKER_VERSION) {
        localStorage.setItem(trackerVerWarnSiteKey, '1');
      }
      if (type === WARNINGS.VIRTUAL_ELS_FAIL) {
        localStorage.setItem(vModeWarnSiteKey, '1');
      }
      setWarnings((prev: Warns) => {
        const newWarnings = [...prev];
        newWarnings[type] = false;
        return newWarnings as Warns;
      });
    };

    if (!warnings.some((el) => el === true)) return null;

    const learnMore = (href: string) => (
      <a href={href} target="_blank" rel="noreferrer">
        {t('Learn more')}
      </a>
    );

    return (
      <>
        {warnings[WARNINGS.LOCALHOST] ? (
          <Notice
            kind="info"
            action={learnMore(DOCS_LOCALHOST)}
            onDismiss={() => closeWarning(WARNINGS.LOCALHOST)}
          >
            {t('Recorded on localhost: some assets may not load.')}
          </Notice>
        ) : null}
        {warnings[WARNINGS.TRACKER_VERSION] ? (
          <Notice
            kind="warning"
            action={learnMore(DOCS_TRACKER)}
            onDismiss={() => closeWarning(WARNINGS.TRACKER_VERSION)}
          >
            {t(
              'Recorded with tracker {{version}}, newer than the {{current}} this app plays. Parts of it may not play back right.',
              { version, current: trackerVersion },
            )}
          </Notice>
        ) : null}
        {warnings[WARNINGS.VIRTUAL_ELS_FAIL] ? (
          <Notice
            kind="info"
            action={
              <button
                type="button"
                className="m-notice__link"
                onClick={onVMode}
              >
                {t('Turn on Virtual Mode')}
              </button>
            }
            onDismiss={() => closeWarning(WARNINGS.VIRTUAL_ELS_FAIL)}
          >
            {t(
              'Custom HTML elements (e.g. Lightning Web Components) may not display.',
            )}
          </Notice>
        ) : null}
      </>
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
      <Notice kind="info">
        {t('You are viewing a portion of full session')}
      </Notice>
    </div>
  );
}

export default WarnBadge;
