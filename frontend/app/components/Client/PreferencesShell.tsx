import { PageCard, PagePanel } from '@/ui/layout/PageCard';
import { useViewport } from '@/ui/layout/use-viewport';
import type { TFunction } from 'i18next';
import {
  Blocks,
  ChevronRight,
  CreditCard,
  Film,
  FlaskConical,
  FolderKanban,
  KeyRound,
  type LucideIcon,
  PlayCircle,
  ScrollText,
  Settings2,
  TriangleAlert,
  UserRound,
  Users,
  Webhook,
} from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React, {
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import { PREFERENCES_MENU } from 'App/layout/data';
import { activeMenuKey, menuRoutes } from 'App/layout/nav/routes';
import { leafOf, preferencesTree } from 'App/layout/nav/tree';
import { useStore } from 'App/mstore';
import { useLocation, useNavigate } from 'App/routing';
import { mobileScreen } from 'App/utils/isMobile';
import { agentIssuesEnabled, agentTestsEnabled } from 'App/utils/split-utils';

import './preferences.css';

const GROUPS: { label: (t: TFunction) => string; keys: string[] }[] = [
  {
    label: (t) => t('You'),
    keys: [
      PREFERENCES_MENU.ACCOUNT,
      PREFERENCES_MENU.SESSION_SETTINGS,
      PREFERENCES_MENU.PROJECTS,
    ],
  },
  {
    label: (t) => t('Workspace'),
    keys: [
      PREFERENCES_MENU.TEAM,
      PREFERENCES_MENU.ROLES_ACCESS,
      PREFERENCES_MENU.BILLING,
      PREFERENCES_MENU.AUDIT,
    ],
  },
  {
    label: (t) => t('Connections'),
    keys: [
      PREFERENCES_MENU.INTEGRATIONS,
      PREFERENCES_MENU.WEBHOOKS,
      PREFERENCES_MENU.EXPORTED_VIDEOS,
    ],
  },
  {
    label: (t) => t('Armada'),
    keys: [PREFERENCES_MENU.AGENTS, PREFERENCES_MENU.TEST_AGENTS],
  },
];

const LEDES = (
  t: TFunction,
): Record<string, { title: string; lede: string }> => ({
  [PREFERENCES_MENU.ACCOUNT]: {
    title: t('Account'),
    lede: t(
      'Your name, your password, and the keys that speak for your organization.',
    ),
  },
  [PREFERENCES_MENU.SESSION_SETTINGS]: {
    title: t('Session settings'),
    lede: t(
      'Which recordings are worth listing, and how one plays when you open it.',
    ),
  },
  [PREFERENCES_MENU.PROJECTS]: {
    title: t('Projects'),
    lede: t(
      'One project per app you record. Its key, how much it captures, and the metadata it sends.',
    ),
  },
  [PREFERENCES_MENU.TEAM]: {
    title: t('Team'),
    lede: t('Who is in this workspace, and what each of them may do.'),
  },
  [PREFERENCES_MENU.ROLES_ACCESS]: {
    title: t('Roles & access'),
    lede: t('What each role may open, and which projects it sees.'),
  },
  [PREFERENCES_MENU.BILLING]: {
    title: t('Billing'),
    lede: t('Your plan, what you have used of it, and every invoice.'),
  },
  [PREFERENCES_MENU.AUDIT]: {
    title: t('Audit trail'),
    lede: t('Every administrative call made in this workspace.'),
  },
  [PREFERENCES_MENU.INTEGRATIONS]: {
    title: t('Integrations'),
    lede: t(
      'Tools that need a key from you, and give something back to a session.',
    ),
  },
  [PREFERENCES_MENU.WEBHOOKS]: {
    title: t('Webhooks'),
    lede: t('Endpoints an alert can call when it fires.'),
  },
  [PREFERENCES_MENU.EXPORTED_VIDEOS]: {
    title: t('Exported videos'),
    lede: t('Replays rendered to video, ready to download.'),
  },
  [PREFERENCES_MENU.AGENTS]: {
    title: t('Agents'),
    lede: t(
      'Notifications, journey tags, and what the agents may call critical.',
    ),
  },
  [PREFERENCES_MENU.TEST_AGENTS]: {
    title: t('Synthetics'),
    lede: t('Defaults for the agents that run your tests.'),
  },
});

const SECTION_ICON: Record<string, LucideIcon> = {
  [PREFERENCES_MENU.ACCOUNT]: UserRound,
  [PREFERENCES_MENU.SESSION_SETTINGS]: PlayCircle,
  [PREFERENCES_MENU.PROJECTS]: FolderKanban,
  [PREFERENCES_MENU.TEAM]: Users,
  [PREFERENCES_MENU.ROLES_ACCESS]: KeyRound,
  [PREFERENCES_MENU.BILLING]: CreditCard,
  [PREFERENCES_MENU.AUDIT]: ScrollText,
  [PREFERENCES_MENU.INTEGRATIONS]: Blocks,
  [PREFERENCES_MENU.WEBHOOKS]: Webhook,
  [PREFERENCES_MENU.EXPORTED_VIDEOS]: Film,
  [PREFERENCES_MENU.AGENTS]: TriangleAlert,
  [PREFERENCES_MENU.TEST_AGENTS]: FlaskConical,
};

/** Preferences: a grouped rail of sections beside the open one. */
function PreferencesShell({ children }: { children: ReactNode }) {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { userStore, projectsStore } = useStore();
  const { account, isEnterprise } = userStore;
  const isAdmin = account.admin || account.superAdmin;
  const modules: string[] = account.settings?.modules ?? [];
  const routes = menuRoutes(projectsStore.siteId);
  const active = activeMenuKey(location.pathname, routes);

  const items = useMemo(
    () =>
      preferencesTree(t, {
        isEnterprise,
        isAdmin,
        modules,
        isMobile: mobileScreen,
        issues: agentIssuesEnabled(),
        tests: agentTestsEnabled(),
      })
        .flatMap((g) => g.entries)
        .filter((e) => leafOf(e.key) !== 'exit')
        .map((e) => ({ key: leafOf(e.key), label: e.label })),
    [isEnterprise, isAdmin, modules, i18n.language],
  );

  const groups = useMemo(() => {
    const placed = new Set<string>();
    const out = GROUPS.map((g) => {
      const rows = g.keys
        .map((k) => items.find((i) => i.key === k))
        .filter((i): i is { key: string; label: string } => !!i);
      rows.forEach((r) => placed.add(r.key));
      return { label: g.label(t), rows };
    });
    // items another build adds to the menu still get a place here
    const rest = items.filter((i) => !placed.has(i.key));
    if (rest.length) out.push({ label: t('More'), rows: rest });
    return out.filter((g) => g.rows.length > 0);
  }, [items, i18n.language]);

  // phone: a list of sections, each its own page with the way back; a link
  // straight to a section (anything but the default) opens its page
  const phone = useViewport() === 'phone';
  const [atList, setAtList] = useState(
    () => active === PREFERENCES_MENU.ACCOUNT,
  );
  const opened = useRef(active);
  useEffect(() => {
    if (active !== opened.current) setAtList(false);
    opened.current = active;
  }, [active]);
  const open = (key: string) => {
    const to = routes[key];
    if (to) navigate(to());
    setAtList(false);
    window.scrollTo(0, 0);
  };

  const known = active ? LEDES(t)[active] : undefined;
  const head = known ?? {
    title: items.find((i) => i.key === active)?.label ?? t('Preferences'),
    lede: '',
  };

  if (phone && atList)
    return (
      <PageCard
        title={t('Preferences')}
        subtitle={t('Account, workspace and project settings.')}
        split
      >
        {groups.map((g) => (
          <section
            key={g.label}
            className="m-pref-m__group"
            aria-label={g.label}
          >
            <h2 className="m-pref-m__label">{g.label}</h2>
            <PagePanel>
              <ul className="m-pref-m__list">
                {g.rows.map((r) => {
                  const Icon = SECTION_ICON[r.key] ?? Settings2;
                  return (
                    <li key={r.key}>
                      <button
                        type="button"
                        className="m-pref-m__row"
                        onClick={() => open(r.key)}
                      >
                        <Icon
                          size={16}
                          className="m-pref-m__icon"
                          aria-hidden="true"
                        />
                        <span className="m-pref-m__name">{r.label}</span>
                        <ChevronRight
                          size={16}
                          className="m-pref-m__chev"
                          aria-hidden="true"
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </PagePanel>
          </section>
        ))}
      </PageCard>
    );

  if (phone)
    return (
      <PageCard
        back={{
          label: t('Preferences'),
          onClick: () => {
            setAtList(true);
            window.scrollTo(0, 0);
          },
        }}
        title={head.title}
        subtitle={head.lede || undefined}
        split
      >
        <PagePanel>
          <div className="m-pref m-pref--phone">
            <div className="m-pref__body m-step-in" key={active}>
              {children}
            </div>
          </div>
        </PagePanel>
      </PageCard>
    );

  return (
    <PageCard
      title={t('Preferences')}
      subtitle={t('Account, workspace and project settings.')}
      split
    >
      <div className="m-pref">
        <PagePanel>
          <nav className="m-pref__rail" aria-label={t('Preferences sections')}>
            <div className="m-pref__groups">
              {groups.map((g) => (
                <div key={g.label} className="m-pref__cluster">
                  <hr className="m-pref__rule" />
                  <h2 className="m-pref__group-label">{g.label}</h2>
                  <div className="m-pref__group">
                    {g.rows.map((r) => (
                      <button
                        key={r.key}
                        type="button"
                        className={`m-pref__item m-hover${r.key === active ? ' is-active' : ''}`}
                        aria-current={r.key === active ? 'page' : undefined}
                        onClick={() => {
                          const to = routes[r.key];
                          if (to) navigate(to());
                        }}
                      >
                        <span className="m-pref__item-label">{r.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </nav>
        </PagePanel>
        <PagePanel>
          <div className="m-pref__section">
            <header className="m-pref__head">
              <div className="m-pref__head-lead">
                <h2 className="m-pref__title">{head.title}</h2>
                {head.lede ? <p className="m-pref__lede">{head.lede}</p> : null}
              </div>
            </header>
            <div className="m-pref__body m-step-in" key={active}>
              {children}
            </div>
          </div>
        </PagePanel>
      </div>
    </PageCard>
  );
}

export default observer(PreferencesShell);
