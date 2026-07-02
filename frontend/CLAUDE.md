# OpenReplay frontend — Test Agents redesign demo

This branch (`feat/test-agents-redesign`) redesigns the **Test Agents** ("Kai")
preferences page as a mock-data prototype inside the real OpenReplay frontend.

It reuses the no-login mock environment built for the AI Issues prototype
(`mockBootstrap`, `MOCK=1` gating, `dev:mock`, Vercel deploy config). The Test Agents
UI was transplanted from upstream's `kai-testing-ui` branch; it runs entirely on mock
data (`KaiSettings/components/shared/mockData.ts`) — no backend.

This is a **design-only** workstream: change the UI/design, keep it on mock data.
Do not wire real APIs.

## Running the prototype (no login, mock data)

This worktree runs on **port 3334** (the Issues worktree uses 3333):

```bash
MOCK=1 ./node_modules/.bin/parcel app/index.html --port 3334
# or, via the Issues default port: yarn dev:mock
```

Then open: **http://localhost:3334/client/test-agents**

- `MOCK=1` triggers `app/dev/mockBootstrap.ts` (gated in `app/initialize.tsx`), which
  seeds a fake user + project into the MobX stores so the app chrome and preferences
  pages render with **no backend and no login**.
- Test Agents data is mock/in-memory from `KaiSettings/components/shared/mockData.ts`.
- Console errors about JWT / property filters are the expected no-backend noise.

## Key files

- `app/components/Client/KaiSettings/` — the Test Agents page (index + tabs)
  - `index.tsx` — `PageTitle('Test Agents')` + tabs (Auto-Testing Settings / Test Runs)
  - `components/` — `SettingsTab`, `RunsTab`, `RunRow`, `Environments`, `TestCaseContent`
  - `components/shared/mockData.ts` — mock data + types (`MOCK_RUNS`, environments, test cases)
- Wiring (kept minimal, transplanted from `kai-testing-ui`):
  - `app/utils/routeUtils.ts` — `CLIENT_TABS.TEST_AGENTS = 'test-agents'`
  - `app/components/Client/Client.tsx` — `case CLIENT_TABS.TEST_AGENTS: return <KaiSettings />`
  - `app/layout/data.ts` — `PREFERENCES_MENU.TEST_AGENTS` nav entry (always visible here)
- `app/dev/mockBootstrap.ts` / `app/initialize.tsx` — the no-backend auth/store seed
