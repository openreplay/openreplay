import { describe, expect, it, jest } from '@jest/globals';
import { makeAutoObservable } from 'mobx';
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, useNavigate } from 'react-router';

import withSiteIdUpdater from 'App/components/hocs/withSiteIdUpdater';
import { LocationSync, StableRoutes, useLocation } from 'App/routing';

const projectsStore = makeAutoObservable({
  siteId: '1',
  setSiteId(id: string) {
    projectsStore.siteId = id;
  },
});

jest.mock('App/mstore', () => ({
  useStore: () => ({ projectsStore }),
}));

const MAX_NAVIGATIONS = 50;
const visited: string[] = [];
let navigate: ReturnType<typeof useNavigate>;

function Page() {
  navigate = useNavigate();
  const { pathname } = useLocation();
  visited.push(pathname);
  if (visited.length > MAX_NAVIGATIONS) throw new Error('navigation loop');
  return null;
}

const Wrapped = withSiteIdUpdater(Page);

describe('withSiteIdUpdater', () => {
  it('settles when the URL points at a different project than the store', async () => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const root = createRoot(document.createElement('div'));

    await act(async () => {
      root.render(
        <MemoryRouter
          initialEntries={[{ pathname: '/1/dashboard/5', key: 'start' }]}
        >
          <LocationSync />
          <StableRoutes>
            <Route path="/:siteId/dashboard/*" element={<Wrapped />} />
          </StableRoutes>
        </MemoryRouter>,
      );
    });

    // user picks project 2 in the project dropdown
    await act(async () => projectsStore.setSiteId('2'));
    expect(visited.at(-1)).toBe('/2/dashboard/5');

    // dashboard 5 is not in project 2; DashboardView redirects with its old siteId
    visited.length = 0;
    await act(async () => navigate('/1/dashboard'));

    expect(visited.length).toBeLessThan(MAX_NAVIGATIONS);
    expect(visited.at(-1)).toBe('/1/dashboard');
    expect(projectsStore.siteId).toBe('1');
    act(() => root.unmount());
  });
});
