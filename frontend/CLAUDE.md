# OpenReplay frontend — AI Issues redesign demo

This branch (`feat/ai-issues-redesign`) adds the redesigned **AI Issues** page as a
mock-data prototype inside the real OpenReplay frontend.

## Running the Issues prototype (no login, mock data)

**Always run the prototype this way** — it's the only correct way to open the Issues
page locally:

```bash
yarn dev:mock      # == MOCK=1 parcel app/index.html --port 3333 --open
```

Then open: **http://localhost:3333/1/issues**

- `MOCK=1` triggers `app/dev/mockBootstrap.ts` (gated in `app/initialize.tsx`), which
  seeds a fake user + project (siteId `1`) into the MobX stores so the app chrome and
  Issues page render with **no backend and no login**.
- Issues data is mock/in-memory from `app/mstore/issuesStore.ts`.
- Other pages render as empty states. This mirrors the deployed demo:
  https://openreplay-issues-demo.vercel.app/1/issues

## Do NOT use plain `yarn dev` for the prototype

Plain `yarn dev` boots the real app → login screen. The local `.env` has no backend
(`API_EDP`/`ORIGIN` empty), so login fails and the page is unusable. Use `yarn dev:mock`.

## Key files

- `app/components/Issues/IssuesList.tsx`, `IssueDetail.tsx`, `TagFilter.tsx`, `issues.css`
- `app/mstore/issuesStore.ts` — mock data + types
- `app/dev/mockBootstrap.ts` — the no-backend auth/store seed
- `app/initialize.tsx` — `if (process.env.MOCK === '1') seedMockStore()`
