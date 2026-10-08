import type { TFunction } from 'i18next';

import { MENU, PREFERENCES_MENU, preferences } from 'App/layout/data';
import { menuHidden } from 'App/utils/split-utils';
import { MODULES } from 'Components/Client/Modules/extra';

export type NavIconName =
  | 'recordings'
  | 'armada'
  | 'cobrowse'
  | 'spot'
  | 'analytics'
  | 'dataManagement'
  | 'exit'
  | PREFERENCES_MENU;

export interface NavEntry {
  key: string;
  label: string;
  icon?: NavIconName;
  count?: number;
  countNoun?: string;
  badge?: string;
  items?: NavEntry[];
}

export interface NavGroup {
  label?: string;
  entries: readonly NavEntry[];
}

export interface NavFlags {
  isEnterprise: boolean;
  isAdmin: boolean;
  modules: string[];
  isMobile: boolean;
  issues: boolean;
  tests: boolean;
  audits: boolean;
}

export const PREFERENCES_PARENT = 'preferences';

const leaf = (parent: string, key: string, label: string): NavEntry => ({
  key: `${parent}/${key}`,
  label,
});

const visible = <T>(items: (T | false)[]): T[] =>
  items.filter((i): i is T => i !== false);

const withItems = (entry: NavEntry): NavEntry | false =>
  entry.items && entry.items.length === 0 ? false : entry;

export function navTree(t: TFunction, f: NavFlags): readonly NavGroup[] {
  const entries = visible<NavEntry>([
    withItems({
      key: 'recordings',
      label: t('Recordings'),
      icon: 'recordings',
      items: visible([
        leaf('recordings', MENU.SESSIONS, t('Sessions')),
        f.isEnterprise
          ? leaf('recordings', MENU.VAULT, t('Vault'))
          : !menuHidden.bookmarks &&
            leaf('recordings', MENU.BOOKMARKS, t('Bookmarks')),
        !menuHidden.segments &&
          !menuHidden.dataAnalytics &&
          leaf('recordings', MENU.SEGMENTS, t('Segments')),
      ]),
    }),
    (f.issues || f.tests || f.audits) &&
      withItems({
        key: 'agents',
        label: t('Armada'),
        icon: 'armada',
        items: visible([
          f.issues && leaf('agents', MENU.ISSUES, t('Issues')),
          f.tests && leaf('agents', MENU.TEST_AGENTS, t('Synthetics')),
          f.audits && leaf('agents', MENU.AUDITS, t('Audits')),
        ]),
      }),
    !f.modules.includes(MODULES.ASSIST) &&
      !f.isMobile && {
        key: MENU.LIVE_SESSIONS,
        label: t('CoBrowse'),
        icon: 'cobrowse',
      },
    { key: MENU.SPOTS, label: t('Spot'), icon: 'spot' },
    {
      key: 'analytics',
      label: t('Product Analytics'),
      icon: 'analytics',
      items: visible([
        leaf('analytics', MENU.DASHBOARDS, t('Dashboards')),
        leaf('analytics', MENU.CARDS, t('Cards')),
        !f.modules.includes(MODULES.ALERTS) &&
          leaf('analytics', MENU.ALERTS, t('Alerts')),
      ]),
    },
    !menuHidden.dataAnalytics &&
      withItems({
        key: 'data',
        label: t('Data Management'),
        icon: 'dataManagement',
        items: visible([
          leaf('data', MENU.ACTIVITY, t('Activity')),
          leaf('data', MENU.USERS, t('People')),
          !menuHidden.lexicon && leaf('data', MENU.EVENTS, t('Events')),
          !menuHidden.lexicon && leaf('data', MENU.PROPS, t('Properties')),
          leaf('data', MENU.TAGS, t('Features')),
        ]),
      }),
  ]);
  return [{ entries }];
}

export function preferencesTree(
  t: TFunction,
  f: NavFlags,
): readonly NavGroup[] {
  const items = preferences(t)
    .flatMap((c) => c.items)
    .filter(
      (i) =>
        !i.hidden &&
        !(i.isAdmin && !f.isAdmin) &&
        !(i.isEnterprise && !f.isEnterprise) &&
        !(i.key === PREFERENCES_MENU.EXPORTED_VIDEOS && !f.isEnterprise),
    );
  return [
    {
      entries: items.map((i) =>
        i.key === MENU.EXIT
          ? { key: MENU.EXIT, label: String(i.label), icon: 'exit' as const }
          : {
              key: `${PREFERENCES_PARENT}/${String(i.key)}`,
              label: String(i.label),
              icon: i.key as PREFERENCES_MENU,
            },
      ),
    },
  ];
}

export const leafOf = (key: string) => key.slice(key.lastIndexOf('/') + 1);
