import { cityAfterCode } from '@/lib/geo';
import { RelativeTime } from '@/ui/data/RelativeTime';
import { SessionAvatar } from '@/ui/data/SessionAvatar';
import { seedFor } from '@/ui/data/avatar';
import { PopoverPanel } from '@/ui/overlays/popover';
import { Tooltip } from '@/ui/overlays/tooltip';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { countries } from 'App/constants';
import { IFRAME } from 'App/constants/storageKeys';
import { formatTimeOrDate } from 'App/date';
import { useStore } from 'App/mstore';
import { capitalize } from 'App/utils';

import { MetaChips } from 'Shared/SessionsTable/MetaChips';

// the drawer's session table and date picker load the first time it opens
const UserSessionsDrawer = React.lazy(
  () => import('Shared/UserSessionsDrawer'),
);

function ReplayLead({ width, height }: { width?: number; height?: number }) {
  const { t } = useTranslation();
  const { settingsStore, sessionStore, customFieldStore, projectsStore } =
    useStore();
  const session = sessionStore.current;
  const { timezone } = settingsStore.sessionSettings;
  const [details, setDetails] = React.useState(false);
  const iframe = localStorage.getItem(IFRAME) === 'true';
  const {
    userBrowser,
    userBrowserVersion,
    userCountry,
    userCity,
    userState,
    userOs,
    userOsVersion,
    userDevice,
    userDeviceType,
    userId,
    userDisplayName,
    live,
    active,
    startedAt,
    revId,
    screenWidth,
    screenHeight,
    metadata,
  } = session as any;

  React.useEffect(() => {
    const site = `${projectsStore.activeSiteId}`;
    if (customFieldStore.listFor !== site || customFieldStore.list.length === 0)
      void customFieldStore.fetchList(site);
    const onKey = (e: KeyboardEvent) => {
      if (!e.shiftKey || e.ctrlKey || e.metaKey || e.key !== 'I') return;
      const el = e.target as HTMLElement | null;
      if (el && /^(INPUT|TEXTAREA)$/.test(el.tagName)) return;
      e.preventDefault();
      setDetails((d) => !d);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const os = /ios/i.test(userOs) ? 'iOS' : capitalize(userOs ?? '');
  const country = (countries as Record<string, string>)[userCountry];
  const city = cityAfterCode(userCity, userCountry);
  const place = [city, country].filter(Boolean).join(', ');
  const tech = session.isMobileNative
    ? userDevice
      ? t('{{device}} on {{os}}', { device: userDevice, os })
      : os
    : userBrowser
      ? t('{{browser}} on {{os}}', { browser: capitalize(userBrowser), os })
      : os;
  const shownKeys = customFieldStore.list.map((f: any) => f.key);
  const shownMeta = Object.fromEntries(
    Object.entries(metadata ?? {}).filter(([k]) => shownKeys.includes(k)),
  ) as Record<string, string | null>;

  const [userSessions, setUserSessions] = React.useState(false);
  // stays mounted after the first open so closing animates
  const [userSessionsUsed, setUserSessionsUsed] = React.useState(false);
  const openUser = () => {
    setUserSessionsUsed(true);
    setUserSessions(true);
  };

  const rows: [string, React.ReactNode][] = [
    [t('Location'), [city, userState, country].filter(Boolean).join(', ')],
    [
      t('Browser'),
      userBrowser && !session.isMobileNative
        ? `${capitalize(userBrowser)} ${userBrowserVersion ?? ''}`
        : '',
    ],
    [t('OS'), `${os} ${userOsVersion ?? ''}`],
    [
      t('Device'),
      `${capitalize(userDevice ?? userDeviceType ?? '')}${
        (width || screenWidth) && (height || screenHeight)
          ? ` · ${width || screenWidth}×${height || screenHeight}`
          : ''
      }`,
    ],
    [
      t('Started'),
      `${formatTimeOrDate(startedAt, timezone, true)} ${timezone?.label ?? ''}`,
    ],
    ...(revId ? ([[t('Rev ID'), revId]] as [string, string][]) : []),
  ];

  const liveWords = active === false ? t('Live, inactive') : t('Live, active');

  return (
    <div className="m-rs__who">
      {live ? (
        <Tooltip title={liveWords}>
          <span className="m-rs__avatar">
            <SessionAvatar
              seed={seedFor(session as any)}
              size={28}
              presence={active === false ? 'inactive' : 'active'}
              animated
            />
            <span className="m-sr-only">{liveWords}</span>
          </span>
        </Tooltip>
      ) : (
        <SessionAvatar seed={seedFor(session as any)} size={28} />
      )}
      <div className="m-rs__names">
        <span className="m-rs__name-line">
          {userId && !iframe ? (
            <Tooltip title={t('All sessions of this user')} delay={500}>
              <button
                type="button"
                className="m-rs__name m-rs__name--link m-truncate"
                onClick={openUser}
              >
                {userDisplayName}
              </button>
            </Tooltip>
          ) : (
            <span className="m-rs__name m-truncate">{userDisplayName}</span>
          )}
          {Object.keys(shownMeta).length > 0 && (
            <MetaChips metadata={shownMeta} max={2} />
          )}
        </span>
        <span className="m-rs__meta m-truncate">
          <span>{tech}</span>
          {place && <span>· {place}</span>}
          <span>
            · <RelativeTime at={startedAt} timezone={timezone?.value} />
          </span>
          <PopoverPanel
            open={details}
            onOpenChange={setDetails}
            placement="bottomLeft"
            content={
              <dl className="m-rs__details">
                {rows
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <React.Fragment key={k}>
                      <dt>{k}</dt>
                      <dd>{v}</dd>
                    </React.Fragment>
                  ))}
              </dl>
            }
          >
            <button type="button" className="m-rs__more">
              · {t('More')}
            </button>
          </PopoverPanel>
        </span>
      </div>
      {userId && userSessionsUsed && (
        <React.Suspense fallback={null}>
          <UserSessionsDrawer
            open={userSessions}
            onClose={() => setUserSessions(false)}
            userId={userId}
            name={userDisplayName}
          />
        </React.Suspense>
      )}
    </div>
  );
}

export default observer(ReplayLead);
