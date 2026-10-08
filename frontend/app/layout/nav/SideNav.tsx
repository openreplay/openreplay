import { ArmadaMark } from '@/ui/brand/ArmadaMark';
import { OpenReplayMark } from '@/ui/brand/OpenReplayMark';
import { Tooltip } from '@/ui/overlays/tooltip';
import RecordingsMeter from 'Saas/nav/RecordingsMeter';
import {
  ArrowLeft,
  Bell,
  Bot,
  ChartColumn,
  ChevronsUpDown,
  CircleHelp,
  CreditCard,
  Database,
  Film,
  FolderClosed,
  ListChecks,
  ListVideo,
  Mail,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  PlayCircle,
  Plug,
  Puzzle,
  ScreenShare,
  Settings2,
  UserRound,
  Users,
  Video,
  Webhook,
} from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React, { type ComponentType, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useModal } from 'App/components/Modal';
import SupportModal from 'App/layout/SupportModal';
import { MENU, PREFERENCES_MENU } from 'App/layout/data';
import { useStore } from 'App/mstore';
import { hasSiteId, siteChangeAvailable } from 'App/routes';
import { useLocation, useNavigate } from 'App/routing';
import { getInitials } from 'App/utils';
import { mobileScreen } from 'App/utils/isMobile';
import {
  agentAuditsEnabled,
  agentIssuesEnabled,
  agentTestsEnabled,
  hasHealth,
} from 'App/utils/split-utils';
import HealthStatus from 'Components/Header/HealthStatus';
import SaasHeaderMenuItems from 'Components/Header/SaasHeaderMenuItems/SaasHeaderMenuItems';

import GettingStartedProgress from 'Shared/GettingStarted/GettingStartedProgress';

import AccountMenu from './AccountMenu';
import { NavFlyout } from './NavFlyout';
import { NavItem } from './NavItem';
import { NavSections } from './NavSections';
import { ThemeToggle } from './ThemeToggle';
import UserMenu from './UserMenu';
import { prefetchRoute } from './prefetchRoutes';
import { activeMenuKey, menuAliases, menuRoutes } from './routes';
import './side-nav.css';
import { type NavEntry, type NavIconName, leafOf, navTree } from './tree';
import { COLLAPSE_KEY } from './useNavCollapse';

const AlertTriggersModal = React.lazy(
  () => import('Shared/AlertTriggersModal'),
);

const ICONS: Record<NavIconName, ComponentType<{ size?: number }>> = {
  recordings: PlayCircle,
  armada: ArmadaMark,
  cobrowse: ScreenShare,
  spot: Video,
  analytics: ChartColumn,
  dataManagement: Database,
  exit: ArrowLeft,
  [PREFERENCES_MENU.ACCOUNT]: UserRound,
  [PREFERENCES_MENU.SESSION_SETTINGS]: ListVideo,
  [PREFERENCES_MENU.INTEGRATIONS]: Plug,
  [PREFERENCES_MENU.WEBHOOKS]: Webhook,
  [PREFERENCES_MENU.MODULES]: Puzzle,
  [PREFERENCES_MENU.PROJECTS]: FolderClosed,
  [PREFERENCES_MENU.ROLES_ACCESS]: Network,
  [PREFERENCES_MENU.AUDIT]: ListChecks,
  [PREFERENCES_MENU.TEAM]: Users,
  [PREFERENCES_MENU.NOTIFICATIONS]: Mail,
  [PREFERENCES_MENU.BILLING]: CreditCard,
  [PREFERENCES_MENU.EXPORTED_VIDEOS]: Film,
  [PREFERENCES_MENU.TEST_AGENTS]: Bot,
  [PREFERENCES_MENU.AGENTS]: Bot,
};

interface SideNavProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onNavigated?: () => void;
}

function SideNav({ collapsed, onToggleCollapsed, onNavigated }: SideNavProps) {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { showModal } = useModal();
  const { projectsStore, userStore, notificationStore } = useStore();
  const { account, isEnterprise } = userStore;
  const { siteId } = projectsStore;
  const isAdmin = account.admin || account.superAdmin;
  const modules: string[] = account.settings?.modules ?? [];
  const inPreferences = location.pathname.includes('/client/');
  const issues = agentIssuesEnabled();
  const tests = agentTestsEnabled();
  const audits = agentAuditsEnabled();

  const groups = useMemo(() => {
    const flags = {
      isEnterprise,
      isAdmin,
      modules,
      isMobile: mobileScreen,
      issues,
      tests,
      audits,
    };
    return navTree(t, flags);
  }, [isEnterprise, isAdmin, modules, issues, tests, audits, i18n.language]);

  const routeTable = menuRoutes(siteId);
  const activeLeaf = activeMenuKey(
    location.pathname,
    routeTable,
    menuAliases(siteId),
  );
  const active = useMemo(() => {
    if (!activeLeaf) return '';
    for (const g of groups) {
      for (const e of g.entries) {
        if (leafOf(e.key) === activeLeaf) return e.key;
        const hit = e.items?.find((i) => leafOf(i.key) === activeLeaf);
        if (hit) return hit.key;
      }
    }
    return '';
  }, [groups, activeLeaf]);

  const activeParent = active.includes('/') ? active.split('/')[0] : '';
  const [expanded, setExpanded] = useState<string[]>(() =>
    activeParent ? [activeParent] : [],
  );
  React.useEffect(() => {
    if (activeParent)
      setExpanded((prev) =>
        prev.includes(activeParent) ? prev : [...prev, activeParent],
      );
  }, [activeParent]);
  const toggle = (key: string) =>
    setExpanded((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );

  const [accountOpen, setAccountOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

  const go = (path: string) => {
    navigate(path);
    onNavigated?.();
  };
  const onNavigate = (key: string) => {
    const entry = groups.flatMap((g) => g.entries).find((e) => e.key === key);
    const target = entry?.items?.[0]?.key ?? key;
    const route = routeTable[leafOf(target)];
    if (route) go(route());
  };
  const prefetch = (key: string) => prefetchRoute(leafOf(key));

  const activeSite = projectsStore.list.find((s) => s.id === siteId);
  const showCurrent =
    hasSiteId(location.pathname) || siteChangeAvailable(location.pathname);
  const projectLabel =
    showCurrent && activeSite ? activeSite.host : t('All Projects');
  const org = account.tenantName || account.name;

  const collapseLabel = collapsed ? t('Expand menu') : t('Collapse menu');
  const unread = notificationStore.notificationsCount > 0;
  const toPreferences = () => go(routeTable[MENU.PREFERENCES]());

  return (
    <nav
      className={`m-nav${collapsed ? ' is-collapsed' : ''}`}
      aria-label={t('Main')}
    >
      <div className="m-nav__brand" data-mark-host>
        <OpenReplayMark size={16} className="m-nav__mark" />
        <span className="m-nav__brand-name">OpenReplay</span>
      </div>

      <AccountMenu
        onPreferences={toPreferences}
        open={accountOpen}
        onOpenChange={setAccountOpen}
      >
        <button
          type="button"
          className={`m-nav__account${accountOpen ? ' is-open' : ''}`}
          aria-label={t('Switch project: {{project}}, {{org}}', {
            project: projectLabel,
            org,
          })}
          aria-haspopup="menu"
          aria-expanded={accountOpen}
          data-test-id="project-dropdown"
        >
          <span className="m-nav__account-badge" aria-hidden="true">
            {org.charAt(0).toUpperCase()}
          </span>
          <span className="m-nav__account-text">
            <span className="m-nav__account-name m-truncate">
              {projectLabel}
            </span>
            <span className="m-nav__account-org m-truncate">{org}</span>
          </span>
          <ChevronsUpDown
            size={13}
            className="m-nav__account-caret"
            aria-hidden="true"
          />
        </button>
      </AccountMenu>

      <div className="m-nav__scroll">
        {groups.map((group, gi) => (
          <div key={group.label ?? gi} className="m-nav__section">
            {gi > 0 && <hr className="m-nav__sep" />}
            {group.label && <p className="m-nav__label">{group.label}</p>}
            <div className="m-nav__group" role="group">
              {group.entries.map((e: NavEntry) => {
                const Icon = e.icon ? ICONS[e.icon] : undefined;
                const open = expanded.includes(e.key);
                const inside =
                  active === e.key || active.startsWith(`${e.key}/`);
                return (
                  <NavFlyout
                    key={e.key}
                    enabled={collapsed}
                    label={e.label}
                    count={e.count}
                    countNoun={e.countNoun}
                    badge={e.badge}
                    sections={e.items}
                    active={active}
                    onNavigate={onNavigate}
                  >
                    <div
                      className="m-nav__row"
                      onMouseEnter={() =>
                        (e.items ?? [e]).forEach((i) => prefetch(i.key))
                      }
                    >
                      <NavItem
                        icon={Icon ? <Icon size={15} /> : undefined}
                        label={e.label}
                        count={e.count}
                        badge={e.badge}
                        active={
                          e.items ? inside && (!open || collapsed) : inside
                        }
                        expandable={e.items != null && !collapsed}
                        expanded={open}
                        onToggle={() => toggle(e.key)}
                        onClick={() => {
                          onNavigate(e.key);
                          if (e.items && !open && !collapsed) toggle(e.key);
                        }}
                      />
                      {e.items && open && !collapsed && (
                        <NavSections
                          items={e.items}
                          active={active}
                          onNavigate={onNavigate}
                          light={
                            e.key === 'agents' ? 'var(--m-armada)' : undefined
                          }
                        />
                      )}
                    </div>
                  </NavFlyout>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="m-nav__foot">
        {!collapsed && <GettingStartedProgress />}
        <div className="m-nav__tools">
          {collapsed && <GettingStartedProgress compact />}
          <Tooltip title={`${collapseLabel}  ${COLLAPSE_KEY}`} side="right">
            <button
              type="button"
              className="m-nav__tool m-nav__collapse"
              aria-label={collapseLabel}
              aria-expanded={!collapsed}
              onClick={onToggleCollapsed}
            >
              {collapsed ? (
                <PanelLeftOpen size={15} aria-hidden="true" />
              ) : (
                <PanelLeftClose size={15} aria-hidden="true" />
              )}
            </button>
          </Tooltip>
          <Tooltip title={t('Preferences')} side="right">
            <button
              type="button"
              className={`m-nav__tool${inPreferences ? ' is-active' : ''}`}
              aria-label={t('Preferences')}
              onClick={toPreferences}
              onMouseEnter={() => prefetchRoute(MENU.PREFERENCES)}
            >
              <Settings2 size={15} aria-hidden="true" />
            </button>
          </Tooltip>
          <Tooltip title={t('Alerts')} side="right">
            <button
              type="button"
              className="m-nav__tool"
              aria-label={t('Alerts')}
              onClick={() =>
                showModal(
                  <React.Suspense fallback={null}>
                    <AlertTriggersModal />
                  </React.Suspense>,
                  { right: true },
                )
              }
            >
              <Bell size={15} aria-hidden="true" />
              {unread && <span className="m-dot" />}
            </button>
          </Tooltip>
          <Tooltip title={t('Support')} side="right">
            <button
              type="button"
              className="m-nav__tool"
              aria-label={t('Support')}
              onClick={() => setSupportOpen(true)}
            >
              <CircleHelp size={15} aria-hidden="true" />
            </button>
          </Tooltip>
          <SaasHeaderMenuItems />
          <ThemeToggle className="m-nav__tool" />
          <UserMenu
            onAccount={() => go(routeTable[PREFERENCES_MENU.ACCOUNT]())}
            open={userOpen}
            onOpenChange={setUserOpen}
          >
            <button
              type="button"
              className={`m-nav__avatar${userOpen ? ' is-open' : ''}`}
              aria-label={t('{{name}}: account menu', { name: account.name })}
              aria-haspopup="menu"
              aria-expanded={userOpen}
            >
              {getInitials(account.name)}
            </button>
          </UserMenu>
        </div>
        {hasHealth ? (
          account.name ? (
            <HealthStatus variant="row" />
          ) : null
        ) : (
          <RecordingsMeter />
        )}
      </div>
      <SupportModal onClose={() => setSupportOpen(false)} open={supportOpen} />
    </nav>
  );
}

export default observer(SideNav);
