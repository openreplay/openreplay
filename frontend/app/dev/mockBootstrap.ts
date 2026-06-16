import { runInAction } from 'mobx';
import { stopPersisting } from 'mobx-persist-store';

import Account from 'Types/account';
import Project from 'App/mstore/types/project';
import userStore from 'App/mstore/userStore';
import { projectStore, searchStore } from 'App/mstore';

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
