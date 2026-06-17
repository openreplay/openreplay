import { runInAction } from 'mobx';
import { stopPersisting } from 'mobx-persist-store';

import Account from 'Types/account';
import Project from 'App/mstore/types/project';
import userStore from 'App/mstore/userStore';
import {
  projectStore,
  searchStore,
  sessionStore,
  filterStore,
} from 'App/mstore';
import {
  buildSession,
  buildMockFilters,
  filterPool,
} from 'App/dev/mockSessions';

/**
 * Local, no-backend bootstrap for the Issues design prototype.
 *
 * The real app gates all authenticated pages behind a JWT + a fetched user/site.
 * This seeds a fake user and project straight into the (singleton) MobX stores and
 * stubs the few backend-bound calls the boot path makes, so the genuine app chrome
 * (sidebar, topbar, theme, fonts) renders with no API. Active ONLY when the app is
 * started with MOCK=1 — see initialize.tsx. Never runs in a normal/production build.
 */
function doSeed() {
  const mockProject = new Project({
    projectId: 1,
    name: 'Mock Project',
    host: 'app.example.com',
    platform: 'web',
    recorded: true,
  });

  runInAction(() => {
    userStore.jwt = 'mock-jwt';
    userStore.account = new Account({
      id: '1',
      userId: '1',
      name: 'Demo User',
      email: 'demo@openreplay.com',
      tenantId: 'mock-tenant',
      tenantName: 'OpenReplay',
      admin: true,
      superAdmin: true,
      verifiedEmail: true,
      hasPassword: true,
      changePassword: false,
      edition: 'foss',
      permissions: [
        'SESSION_REPLAY',
        'DEV_TOOLS',
        'ASSIST_LIVE',
        'ASSIST_CALL',
        'SESSION_EXPORT',
        'METRICS',
        'ALERTS',
        'ASSIGNMENTS',
        'MANAGE_ALERTS',
      ],
      settings: { modules: [] },
    });
    userStore.fetchInfoRequest = { loading: false, errors: [] };

    projectStore.list = [mockProject];
    projectStore.siteId = '1';
    projectStore.active = mockProject;
    projectStore.tenantId = 'mock-tenant';
    projectStore.sitesLoading = false;
  });

  // Stub the backend-bound boot calls so they resolve instead of failing (which
  // would otherwise clear the JWT and bounce us back to the login screen).
  userStore.fetchUserInfo = async () => userStore.account;
  projectStore.fetchList = async () => {};
  searchStore.fetchSavedSearchList = async () => {};

  seedSessions();
}

/**
 * Sessions surface, no backend. Serves the shared MOCK_SESSION_POOL — the same
 * entities the Issues surface references — and makes the filter/event bar fully
 * functional client-side. See app/dev/mockSessions.ts.
 */
function seedSessions() {
  // Populate the filter catalog the search bar reads from, and stub the fetch
  // so it never hits the backend (it returns the cached catalog).
  const seedCatalog = (siteId: string) => {
    filterStore.setFilters(siteId, buildMockFilters(filterStore));
    filterStore.setIsLoadingFilters(false);
  };
  seedCatalog('1');
  filterStore.fetchFilters = async (siteId?: string) => {
    const id = String(siteId ?? '1');
    if (!filterStore.filters[id]?.length) seedCatalog(id);
    filterStore.setIsLoadingFilters(false);
    return filterStore.getFilters(id);
  };

  // Replace the /sessions/search round-trip with an in-memory filter+paginate
  // over the shared pool. Mirrors the real method's assignments.
  sessionStore.fetchSessions = async (params: any = {}) => {
    const { sessions, total } = filterPool(params);
    runInAction(() => {
      sessionStore.list = sessions.map(buildSession);
      sessionStore.total = total;
      sessionStore.sessionIds = sessions.map((s) => s.sessionId);
      sessionStore.favoriteList = sessionStore.list.filter((s) => s.favorite);
    });
  };

  // Defuse the remaining backend-bound calls the sessions page fires.
  sessionStore.getFirstMob = async () => ({}) as any;
  sessionStore.prefetchSession = () => {};
  searchStore.checkForLatestSessionCount = async () => {};

  // Pre-seed the bar with a variety of example filters + events so the design
  // can be evaluated populated. `edit` (not addFilter) avoids an early fetch;
  // PrivateRoutes runs the real initial fetch. Values kept loose so the list
  // stays healthy on load.
  const setVal = (f: any, v: string[]) => {
    f.value = v;
    return f;
  };
  const seeded = [
    setVal(filterStore.findEvent({ name: 'CLICK', isEvent: true, autoCaptured: true }), ['']),
    setVal(filterStore.findEvent({ name: 'INPUT', isEvent: true, autoCaptured: true }), ['']),
    setVal(filterStore.findEvent({ name: 'userBrowser', isEvent: false }), ['Chrome']),
  ];
  searchStore.edit({ filters: seeded });

  // Seed the list for first paint, consistent with the seeded bar (safety net
  // in case the PrivateRoutes filtersLoaded gate resolves before our fetch
  // override runs — the list then already matches the visible filters).
  const initialParams = {
    ...searchStore.instance.toSearch(),
    page: 1,
    limit: searchStore.pageSize,
  };
  const initial = filterPool(initialParams);
  runInAction(() => {
    sessionStore.list = initial.sessions.map(buildSession);
    sessionStore.total = initial.total;
    sessionStore.sessionIds = initial.sessions.map((s) => s.sessionId);
  });
}

export function seedMockStore() {
  doSeed();
  // userStore persists `jwt`/`account` and rehydrates from localStorage ~200ms
  // after boot. On a browser with a stale (logged-out) UserStore entry that would
  // clobber the seed and bounce us to login — so stop persistence and re-assert
  // the seed once after the rehydrate window.
  try {
    stopPersisting(userStore);
  } catch {
    /* noop */
  }
  setTimeout(doSeed, 400);
}
