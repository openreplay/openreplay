# UI redesign port (shadcn)

Source: `gabelinares/melonade` PR #1, branch `feat/sessions-unified-search-0902`, app `graphite-shadcn/`
(live: melonade-shadcn.vercel.app). Design log `DESIGN.md` (§66 search, §66.8–66.13 replay/queue/picker),
handoff `context/handoff-2026-10-05.md`. The prototype runs on mock data (`src/state`, `shared/`): only views are ported.

## Decisions (2026-10-07)

- Long-lived branch `redesign/shadcn` off `dev`; merge `dev` in regularly; ship when done.
- Prototype Tailwind scale verbatim: `@theme inline` maps spacing / text / radius / colors onto `--m-*` tokens
  (`p-4` = 8px ladder, `text-sm` = 13px, `rounded-md` = control corner). Root font back to 16px.
  Legacy classes change meaning, so unported pages look off until ported.
- Only the shipped variant values: grey cool, accent teal, IBM Plex, corners soft, density spaced from 1440px
  viewport, search chips, entry table, layout stacked, picker panes, filter pills tinted.
  No prototype panel, no variant switches, no `data-*` variant selectors in ported CSS.
- Keep architecture: mobx stores (`useStore`), `App/routing`, react-query where used, `t()` for every string.
- SaaS-only UI (Audits, billing UI, …) goes to `frontend/saas/` (alias `Saas/*`). New features the prototype invents
  (sessions dock) are phase 12, built into the app itself.
- Features we have that the prototype drops (dashboard DnD/resize, WS/GraphQL/Profiler panels, timeline zoom,
  retention/insights/sunburst cards, mobile player, multiview, …): keep, restyle by extrapolation.
- Highlights (notes) dropped as a feature on 2026-10-07: page, route, nav item, module toggle, player panel/button,
  timeline markers, activity notes, `?note=` modal, notes store/service, clip players.
- Prototype comments are design essays: do not carry them over.

## Layout

- `app/ui/` is the one building-block library, grouped by role: `actions`, `inputs`, `overlays`, `layout`, `data`,
  `feedback`, `filters`, `brand`, `icons`, `styles`. Import a file directly (`@/ui/overlays/tooltip`); no barrels,
  since files import their own CSS and a barrel would pull every stylesheet into each chunk. Primitives keep
  shadcn kebab-case names, composed pieces are PascalCase; named exports only.
- `app/ui/styles/` — `tokens.css` (flattened shipped theme, light + `.dark`), `base.css`, `theme.css`
  (`@theme inline`), `motion.css`.
- Pieces built from the kit for one product area live with it (`Shared/SessionAvatar`, `Shared/RecordingsMeter`,
  `Shared/Link`, `SmartAlerts/shared/*`, `layout/nav/ThemeToggle`, …).
- `app/components/ui` (`'UI'`) is only a compat barrel for the saas overlay (Form, Input, Message, Tooltip, Icon,
  Loader, NoContent, confirm, Link, `UI/Icons`); eslint keeps FOSS code off it.
- `app/lib/utils.ts` — `cn()` (clsx + tailwind-merge). Legacy files keep `cn` = `classnames`.

## Foundation notes

- CSS entry: `app/styles/import.css` imports the `app/ui/styles/*` files right after `@import 'tailwindcss'`
  (imports placed after `@config` are dropped). `tokens.css` is flattened from prototype tokens + proto-themes
  at the shipped values (light `:root`, dark `:root.dark`, spaced density `@media (min-width: 1440px)`).
- Unlayered legacy CSS beats every Tailwind layer: removed `main.css * { border-color }`, `general.css p { margin }`,
  `.ant-btn` overrides, global `.lucide` stroke width; `colors-autogen.css` now in `layer(utilities)`;
  reset's teal focus border skips `[data-slot]` controls. Root font is 16px again (prototype rems).
- tsconfig `jsx` is `react-jsx` (prototype files have no `React` import; Vite already used the automatic runtime).
- antd is gone (phase 11); `app/ui/styles/token-values.ts` (real colour strings from `tokens.css`) stays for code
  that can't read CSS vars.
- Prototype kit pieces not ported as such: CapturePill (our `SegmentsIndicator`), HealthScore / StubDrawer /
  Placeholder (audit and stub pages: saas placeholders), IconPicker / JourneyIcon (journey tags have no icon data),
  RunResultChip / TestStatusChip (Synthetics `shared/utils` chips), BrandLoader (`BrandMark` loop).
- SessionAvatar uses local glyphs on `userNumericHash` (the prototype's dicebear fetch would leak user ids).
- Every user-facing string goes through `t()`; kit defaults like `okText` resolve inside the component.

## Shell notes

- `app/layout/Layout.tsx`: `m-shell` (nav + scrolling `main`); props `immersive` (replay-like routes: nav folds,
  no padding) and `bare` (iframe, MCP authorize). Mobile keeps a drawer + FAB.
- `app/layout/nav/*`: SideNav (observer, real stores), tree.ts (menu flags from the old SideMenu), routes.ts
  (route table + longest-prefix active match), AccountMenu (project switch logic from ProjectDropdown), UserMenu
  (+ System health row), useNavCollapse (settingsStore-backed, <1080px auto, ⌘\, immersive override).
- Labels follow the prototype: Armada (agents), Synthetics (tests), Recordings group (Sessions, Bookmarks/Vault,
  Segments).
- Tooltips use `--m-tooltip-bg/fg/border`: inverse in light, elevated surface + border in dark.
- z tokens: modal/overlay 1000, dropdown 1100, toast 1200, tooltip 1300.
- SaaS-only UI mounts from `saas/` placeholders that render nothing in FOSS (`saas/nav/RecordingsMeter` sits where
  FOSS shows system health). Agent (smart-issues) UI also hides when its API is unreachable: `issuesStore.agentAvailable`.
- Visual check: scratch `shot.mjs` mocks `/account`, `/projects`, `/signup` and sets a fake JWT via `window.setJWT`.

## Filter editor notes

- `Shared/FilterEditor`: `buildFilterEditor(target)` turns any `FilterTarget` (filters + eventsOrder + list ops) into the
  prototype's `FilterEditor` contract; rows are view models (`viewOf`) keyed by index (`"2"`, `"2.0"` for properties).
  Targets: `searchTarget(searchStore)`, `liveSearchTarget(searchStoreLive)`, `useLocalTarget()` for drafts.
- Values: closed sets from `possibleValues`, otherwise `filterStore.fetchTopValues` (share bars from `rowPercentage`)
  and the autocomplete endpoint while typing. Duration edits seconds, stored as ms `[min, max]`.
- Default event properties are loaded before the event is added (the old path set them after the store copied it).
- Saved segment `eventsOrder` is forced to `then` by `toPayload`, so the segment drawer locks the order word.

## Phases

- [x] 0. Foundation: deps, tokens, theme mapping, fonts, base, motion, primitives, kit, antd retheme, `saas/` alias
- [x] 1. Shell: side nav (collapsible rail, flyouts, project switcher), no top header. Open: quota meter (SaaS),
      nav counts (no data source yet); preferences still swap the nav tree until Phase 6 builds the rail
- [x] 2. Sessions list: table, display menu, footer, bookmarks, segments (+ drawer), date range.
      Open: watched show/hide/only (needs backend), issue-type counts (no source)
- [x] 3. Filters: FilterBar / chips / two-pane picker / value picker, shared FilterEditor contract.
      Done: sessions search, segment drawer, assist live search, card series, DM activity (`activityTarget`,
      events OR-locked), people (`peopleTarget`), recording conditions (`ConditionSet` on `seriesTarget`),
      journey start point / excludes (`SingleRule`). Shared/Filters, SessionFilters and MainSearchBar were
      deleted with antd (phase 11); the saas overlay files that import them have to move
- [x] 4. Replay. Done: frame, header, URL bar + tabs, devtools strip, transport, settings menu, timeline, activity
      panel (`EventsBlock` + `ActivityRow`), shared row Jump/Copy tail, devtools panels on `PanelKit`
      (one `BottomBlock`; the strip owns collapse via `PanelHostContext`), request sheet over the player
      (`RequestSheetHost`, opened through `uiPlayerStore.openRequestSheet`), X-Ray lanes, performance charts,
      share dialog, autoplay toast, Features (tag list + tag form), Export E2E panel, Click map list
- [x] 5. Product analytics: dashboards list (+ create drawer from saved cards), dashboard page (4-col grid, drag
      swap, half/full width, card picker), cards list, add-card popover, card page (dock switch, kit toolbar, series on
      `FilterBar` via `seriesTarget`, breakdown door/panel, journey options, sessions on `SessionsTable`), charts
      (`TrendChart` for every timeseries view, big numbers, trend table, funnel, top values + drawer, errors table,
      web vitals, click-map controls, Sankey/sunburst theme, insights), alerts list / page / drawer on one
      `AlertFields`. Presets for new cards: `Dashboard/cardPresets.ts`. CSS: `Dashboard/product-analytics.css`,
      `charts.css`. Legacy-only cards and the error details drawer followed in phase 11
- [x] 6. Preferences: `PreferencesShell` (grouped rail built from `preferences(t)` + `menuRoutes`, so SaaS-added
      items and `extraRoutes` still route; unknown keys land in a "More" group; side nav no longer swaps), in-shell
      `PreferencesPage` frame, `PrefSection` blocks. Ported: account, session settings, projects (rail, tabs,
      this-project, key, capture rate, metadata), weekly report, team (+ member drawer), roles (+ role drawer), audit
      (+ details drawer), modules, integrations (cards; forms still open their own drawers), webhooks (+ drawer),
      exported videos, agents (headings/toggles). SaaS placeholders kept mounted: `ClientSaas`, `Billing`,
      `Dangerzone`, `CaptureLimit`, `Modules/extra.ts`.  EE conditional-capture editor (recording conditions, phase 3), integration forms, test agents + agents' issue
      tab internals (phase 10)
- [x] 7. Data management: activity (FilterBar, server sort, drag/hide columns via `DataTable.onColumnMove` +
      `DisplayShell`, new-events banner, event drawer at `?event_id=`), people (`PeopleTable`, also under user
      properties), person page (card, timeline + hide-events popover, properties drawer on `EditableRow`,
      `Shared/UserSessionsDrawer` — the replay header uses it too), events + properties on one `DataItemPage`
      (status switch, related panel), features (drawer). Person pages map to People in the nav (`menuAliases`).
      CSS: `DataManagement/data-management.css`. Anchors can't be restyled while `tailwind-preflight.css`
      forces `a { color: … !important }` in a layer, so row links are buttons
- [x] 8. Assist / CoBrowse, Spot. Spot player on the replay frame (`DevToolsFrame` shared with sessions),
      Spot list (cards, owner strip, rename/delete dialogs, install notice). CoBrowse page (`CoBrowsePage`: live
      sessions on `SessionsTable` + `FilterBar live`, EE recordings tab), live view on `ReplayScreen` (assist actions
      in the header, live chip + session slots in the controls, console/network on `DevToolsFrame`). Call / requesting
      windows and the multiview picker followed in phase 11
- [x] Mobile (native app) player moved onto `ReplayScreen` + `DevToolsFrame` + shared transport
      (`Controls mobile`); stage rescales via ResizeObserver. Context menu, X-Ray and performance internals followed
      in phase 11
- [x] 9. Onboarding, auth. `Auth/AuthScreen` ground for login / signup / reset / new password (captcha, Spot handshake,
      `?jwt`, SSO states, signup health gate as a card step, live `PasswordRules`, `SupportMenu`, language select).
      Installation status (`HealthReport`) shared by the signup gate and the nav health popover/modal. First run is
      `Onboarding.tsx` on a bare layout: project name gate, `Stepper`, install / identify (metadata keys saved in
      place) / invite (sent on Finish) / summary listening for the first session. `InstallGuide` + `install.ts`
      also drive Preferences > Projects > Installation (`full`: Assist, mobile capture steps). Kit anchors (`m-*`)
      are exempt from the legacy preflight link colour. Integrations left the flow (summary links to them)
- [x] 10. Smart issues / tests; `saas/`: audits, billing. Issues list on `PageCard` (category strip, segments
      indicator, last-seen range, tag/origin `FilterMenu` with match footers, display toggles, server sort); detail
      and issue player on `ReplayScreen` (write-up, session cards strip, ISSUE panel). Synthetics: `SyntheticsFrame`
      (PageCard on /test-agents, preferences page under Preferences; each section owns its toolbar; visited sections
      stay mounted), tests list (status strip, env/tag filters, hideable columns, bulk actions, delete confirm), runs
      log (`DateRange` incl. "All time", filters, live duration), environments (kit drawer form) + defaults; drawers
      on the kit `EntityDrawer` (test/draft wizard/merge/revision review, prototype step list over our react-dnd
      logic, `MultiSelect` run settings, run timeline + activity + HAR viewer). Audits: `saas/audits/AuditsPage`
      placeholder behind plan feature `agent-audits` (route + Armada leaf). Billing stays the FOSS
      `Client/Billing` placeholder the saas repo replaces
- [x] 11. Extrapolation pass (multiview, errors, mobile player, MCP authorize, …; highlights/notes dropped), drop antd + legacy
      tailwind config / colors / UI kit
      - [x] dead code: ~330 files unreachable from `initialize.tsx` and from the saas overlay deleted (plus orphaned
        CSS modules and FOSS-dead barrels); reachability check in the scratchpad `reach.cjs` seeds the overlay
      - [x] legacy `UI` kit retired: Icon / SVG / generated `Icons` → `@/ui/icons` (`scripts/icons.js` writes
        there), Loader + NoContent → `@/ui/feedback`, JSONTree → `@/ui/data`, `confirm` + `ConfirmMountPoint` +
        QuestionMarkHint → `@/ui/overlays`; Link, NoPermission → `Shared`; EscapeButton → `player-ui`;
        Avatar / CountryFlag / Label / TextEllipsis → `Shared/SessionItem` (their only user). Callers of CodeBlock,
        Tabs, Checkbox, Input, Switch, Tooltip, TextEllipsis, CircularLoader moved to the kit; Prism (6 scripts +
        CSS in `index.html`) went with the legacy CodeBlock
      - [x] CSS purge: unused selectors in legacy CSS, Roboto, generated `color-*` / `bg-*` palette classes
        (`scripts/colors.js` now only emits the `fill-*` the Icon builds at runtime)
      - [x] shell: ModalContext / support / phone nav drawers (kit `Drawer` gained `side="left"` and `width`), banners,
        player-ui buttons; multiview (+ picker = CoBrowse `LiveSection` in a drawer). The legacy `showModal`
        provider renders the kit `Drawer`; content brings its head via `DrawerHeader` + `.m-drawer__pane`
      - [x] antd, @ant-design/icons, react-toastify, react-select, rc-time-picker, react-daterange-picker removed;
        `toast` from `@/ui/overlays/toast` is the imperative API. The saas overlay must move off antd itself (12 files)
      - [x] legacy palette names (`theme/colors.js`) alias kit tokens; no separate dark palette. Legacy chart
        `Styles` palettes are getters over `--m-chart-*`
      - [x] error details = prototype `ErrorDrawer` on real data (`Errors/ErrorDrawer` + `StackTrace`), player
        exceptions panel, stack event / GraphQL / profiler drawers, alerts drawer, setup checklist + nav meter,
        Slack/Teams `MessengerForm`, integration forms fill the drawer
      - [x] legacy-only cards: `progress` → big number, sessions table → `SessionsTable`, retention stub restyled
      - [x] long tail: funnel issue sub-page (PageCard + `SessionsTable`), WS frames sheet, backend log rows,
        storage/redux viewer, GraphQL panel → kit drawer, mobile X-Ray perf lane + mobile perf empty state,
        training-videos placeholder → CoBrowse `RecordingsSection`, timeline ticks, hard-coded colours in live
        CSS modules
      - Kept on purpose: the legacy palette names (Tailwind `@config`) and `$vars` stay as aliases of kit tokens;
        `Shared/SessionItem` is saas-only now (overlay lists) and goes when the overlay moves to `SessionsTable`;
        the SVG icon set stays as an asset mechanism (`@/ui/icons/Icon`)
- [x] 12. New features from the prototype: sessions dock (replay queue as tabs over list and player, "Add to queue"
      on rows, sessionStorage, landing pill). `Shared/SessionsDock`: queue store (snapshots in sessionStorage,
      landing as an event), dock ported from the prototype, `SessionsDockHost` mounted once in `Layout` on
      sessions / bookmarks / replay routes. Our main column scrolls, so the dock hangs off a sticky zero-height
      anchor; over a replay it measures `[data-replay-stage]`. The saas `SessionsTabOverview` overlay needs the
      same `queue` prop to get the row control

## Prototype follow-ups (designer PRs after the port base)

- melonade #2 "Spot: a grid that is also a list" (2026-10-08): card with hover-only controls (checkbox,
  copy-link bubble, menu; always drawn on touch and while selected), play disc, avatar byline; the selection
  takes the panel head (page tri-state, "Select all N" across pages via one `limit=total` fetch, shift-click
  span, bulk download / delete); Newest / Oldest in `DisplayShell`; 12 per page; a new search goes back to page 1.
  Not ported, the list API (`GET /spot/spots`: name query, own/all, created asc/desc, page, limit) has no
  params or fields for them: the "Recorded" date window, the Owner / Length / Sharing filter menu (+ chips,
  per-option counts), Longest / Shortest / Title sorts, scope counts, comment and public-link marks on cards
- melonade #3 "The replay side panel: one language for four tabs" (2026-10-08): `ReplayScreen/PanelBar` +
  `side-panel.css` (`m-spanel__*`): one bar per tab (the find IS the bar via `PopoverSearch.trailing`, or a note;
  icon verbs right; height derived from the control height), one row (clock gutter first, glyph, one or two lines,
  hover verb), `xs` type, glyph-only kind colour, Hesitation / Frustration as chips. Applied to Activity
  (`EventsBlock` / `ActivityRow`, Spot activity got the find), Features (`TagWatch`: find + ＋, a row opens the
  form), Click map, Spot comments (avatar rows, count note), the issue Journey (clock first; node lead re-measured
  for our font: -0.6px, not the prototype's -1.6px). Kit: `CheckRow boxed` (form variant, role checkbox).
  Editing a feature from the panel renames or removes only: the tags API's PUT updates `name` alone

## Review pass (2026-10-08)

A full review of the branch diff, fixed in four commits (each re-reviewed after the fix):
- bugs the redesign introduced (drag scrub, project relink, dashboard add-card, overlay clicks, F toggle in dialogs);
- perf: lazy chart panels / dash.js / CoBrowse stats / Preferences tabs, boot and hover-intent route prefetch,
  route transitions (`StableRoutes`), one chart-theme observer, binary-search event lookups, torch rect caching;
- races and silent failures: latest-wins tokens on list fetches, per-project resets, store writes rethrow and pages
  toast or roll back, admin + project-limit gating on Projects, plan gating on Agents, captcha that always settles;
- kit cleanups: drafts seeded on open only, shared `useIndicator`, arrow keys in hand-rolled menus (`menuKeys`),
  toast ids at emit, CSS loop for `BrandMark`, `token-values.ts` regenerated and guarded by
  `tests/unit/tokenValues.test.ts` (kept: saas `PaymentInformation` reads it).

Left as is on purpose: width/height transitions (nav collapse, dock; discrete user actions, no measured cost),
the two drawer systems (`App/components/Modal` + `ModalContext`; many callers incl. saas), drawer `Field` vs kit
`Field` (different styling), `Steps` vs `Stepper` (different jobs), loading-flag flicker from superseded requests.
`/client/metadata` now redirects to Projects › Metadata, and Projects opens on the active project.

E2E (mocked API, production build, Playwright): sessions, replay (web + iOS), CoBrowse (EE), Spot, dashboards /
cards / alerts, data management, issues, Synthetics, onboarding, every Preferences tab, auth pages, member role,
dark mode, shell controls. Mock gaps, not app bugs: the filter catalogue lacks `issue` / `location`, so two
"Filter not found" logs; replay CSS is missing because the mock mob's assets aren't served.

## SaaS repo handoff

The SaaS build copies `saas/saas/frontend/**` over this FOSS `frontend/` by path, then `mod-package.js` adds
its deps (Stripe, `@openreplay/tracker`, …). Checked on 2026-10-08 against the saas repo at
`~/Documents/work/work/saas/saas/frontend` (90 overlay files): **it does not build on this branch yet.**
Below is what to change on the saas side, roughly in the order the build will complain.

### 1. Libraries that are gone from FOSS `package.json`

- **react-toastify** (9 files: `mstore/billingStore.ts`, `Signup/SignupForm`, `DevTools/ExplainButton`,
  `RecommendedSessions`, `Integrations/ElasticsearchForm`, `Integrations/Integrations`, `Billing/PaymentInformation`,
  `Login/Login`, `Session/ClipPlayer`): switch to `import { toast } from '@/ui/overlays/toast'`. Same call shape
  (`toast.success/error/info/warn`, `toast(text, { type, autoClose, toastId })`, `toast.dismiss`, `toast.promise`).
  There is no `ToastContainer` any more, so adding the package back would not show anything.
- **antd / @ant-design/icons** (22 files, mostly saas-only: Billing (+ Card, PaymentInformation, CreditCardButton,
  Invoices, Usage), Clips, `TrialNotification`, `DeleteAccount`, `Dangerzone`, `Support`, `SimilarSessionsModal`,
  `SimilarSessionsButton`, `SummaryButton`, `RecommendedSessions`, `AiSessionSearchField`, `ExplainButton`,
  `NoSessionsMessage`, `AiQuerySection`, `Login`, `SignupForm`, `SlackForm`): move to the kit (`@/ui/actions/button`,
  `@/ui/inputs/input`, `@/ui/overlays/modal` + `@/ui/overlays/ConfirmDialog`, `@/ui/inputs/select`
  (`SimpleSelect`), `@/ui/overlays/tooltip`, `@/ui/overlays/popover`, `@/ui/actions/dropdown-menu`,
  `@/ui/data/table` (DataTable), `@/ui/feedback/EmptyState`, `@/ui/feedback/Notice`, `@/ui/data/Chip`,
  `@/ui/overlays/EntityDrawer`, …; icons from `lucide-react`). A stop-gap is adding `antd` + `@ant-design/icons` to
  `mod-package.js`, but FOSS no longer mounts antd's `ConfigProvider` / `App` (so `App.useApp()`, `message`,
  `notification` hooks break) and the `.ant-*` overrides are gone from FOSS CSS, so it renders unthemed.
- **react-select, rc-time-picker, react-daterange-picker** are gone too (no saas file imports them).
- **react-redux** was already gone on `main`: `Survey`, `PlanUpgradeNotification`, `Integrations/ElasticsearchForm`
  (also `Duck/integrations/actions`) were broken before this branch. `Survey` is mounted again (shell), so it needs
  `useStore().userStore.account` instead of `connect`.
- `UI` barrel: now a compat barrel for the overlay only. It still exports what saas imports (Form, Input, Message,
  Tooltip, Icon, Loader, NoContent, confirm, Link, plus `UI/Icons`) except **`Popup`** (`PlanUpgradeNotification`;
  use `Tooltip` from `@/ui/overlays/tooltip`). Move off it, then delete `app/components/ui`: Icon →
  `{ Icon } from '@/ui/icons/Icon'`, Loader / NoContent → `@/ui/feedback/*` (named), `confirm` →
  `@/ui/overlays/confirm`, Link → `Shared/Link/Link`, `Clips_icon` → `@/ui/icons/Icons`; Form / Input / Message /
  legacy Tooltip have kit counterparts (`<form>` + `@/ui/inputs/Field`, `@/ui/inputs/input`, `@/ui/feedback/Notice`,
  `@/ui/overlays/tooltip`).
- Generated `color-*` text classes are gone (`bg-*` / `border-*` from the legacy palette still work through
  Tailwind): saas uses `color-gray-medium` (4), `color-red` (2), `color-black` (1) → `text-gray-medium`,
  `text-red`, `text-black`.

### 2. Overrides of FOSS files that changed here (merge, don't overwrite)

| saas file | what FOSS changed | action |
|---|---|---|
| `app/utils/split-utils.ts` | added `agentAuditsEnabled` + `'agent-audits'` in `PlanFeature`; `menuHidden.segments` (saas has `actions`) | re-sync with FOSS, keep the saas values (`hasAi`, `hasHealth`, `hasIssuesSummary`, `hasSampling`, `menuHidden`). **Build-breaking**: FOSS `layout/nav/SideNav.tsx` and `saasComponents.tsx` import `agentAuditsEnabled` |
| `app/saasComponents.tsx` | `/audits` route (`Saas/audits/AuditsPage`) + `MENU.AUDITS` menu item behind `agent-audits` | merge, or the Audits page disappears in saas |
| `app/components/Client/Modules/extra.ts` | `MODULES.HIGHLIGHTS` removed (Highlights dropped) | harmless to keep |
| `Header/DefaultMenuView/Version.tsx`, `Header/HealthStatus/HealthStatus.tsx` | restyled; Version now renders at the foot of the user menu, HealthStatus in the nav tools | saas `return null` versions keep working |
| `app/extraRoutes.ts` | unchanged here, but the saas copy is older (its `queried` drops array params) | delete the override |

### 3. Overrides that import FOSS modules removed by the redesign

| saas override | missing FOSS imports | action |
|---|---|---|
| `Client/Integrations/SlackForm.tsx` | `./SlackAddForm`, `./SlackChannelList/*` | delete: FOSS `SlackForm` / `Teams` now render `MessengerForm` (list, add, edit, delete, kit drawer) |
| `Client/Integrations/Integrations.tsx` | `IntegrationFilters`, `IntegrationItem` (categories are sections now) | re-apply the saas delta on the new FOSS file: GitHub connects through `auth.openreplay.com` OAuth (`onOauthClick`) instead of `GithubForm`; `hideHeader` prop for the onboarding embed. FOSS already handles disconnecting an `oauth` integration with a confirm |
| `Client/ProfileSettings/ProfileSettings.tsx` | `./Settings`, `./ChangePassword`, `./Api`, `./Licenses`, `LanguageSwitcher` | delete: the FOSS account page already mounts the `Dangerzone` placeholder. Saas deltas to carry over: Dangerzone only for the owner (put the `isOwner` check inside saas `Dangerzone`); saas hid OptOut and TenantKey (FOSS shows the tenant key only to enterprise admins and data collection only when not enterprise; confirm what SaaS accounts report) |
| `Login/Login.tsx` | `Shared/Copyright`, `../LanguageSwitcher` | re-port onto FOSS `Login.tsx` (on `Auth/AuthScreen`): saas hides SSO, skips the "no tenants → signup" redirect, adds a "Create account" link |
| `Signup/Signup.tsx`, `Signup/SignupForm/SignupForm.tsx` | `Shared/Copyright`, `Shared/Select` | FOSS signup is on `AuthScreen` with captcha (`withRecaptcha`) and the health gate; carry over only the saas plan bullets ("1,000 monthly sessions", …) |
| `shared/SessionsTabOverview/SessionsTabOverview.tsx` | `MainSearchBar`, `SearchActions`, `SessionList`, `SessionHeader` | delete: its only delta was the tracker import, and FOSS already calls `trackerInstance` from `@/init/openreplay` (saas overrides that). The override would also drop the redesigned list, the sessions dock's "Add to queue" and scroll restore |
| `shared/NoSessionsMessage/NoSessionsMessage.tsx` | (antd) | delete for the same reason (FOSS uses `trackerInstance`) |
| `Session/ClipPlayer.tsx`, `Clips/*`, `mstore/clipStore.ts` | `ClipPlayerHeader`, `ClipPlayerContent` | nothing in saas routes to them and FOSS dropped clips with Highlights: delete |
| `Dashboard/components/AiQuerySection.tsx` | `./DashboardView/AiQuery` | not mounted on `main` either: delete or leave |

### 4. FOSS targets that are gone or no longer mounted

- `shared/SupportCallout/**` (saas copies are identical to old FOSS): gone; auth pages use the kit `SupportMenu`,
  the app has the support drawer (`CrispIframe` still mounts there). Delete the overrides.
- `Onboarding/.../InstallDocs/code.js`, `shared/TrackingCodeModal/InstallDocs/code.js`: gone; snippets come from
  `Onboarding/install.ts`, which drops `ingestPoint` when the host contains `app.openreplay.com`. Delete the
  overrides; if SaaS serves the app from another host, widen `isSaas()` there.
- `Assist/AssistSearchActions/TrainingVideosBtn.tsx` (saas `return null`) and `Header/SettingsMenu/utils.ts`:
  no longer mounted (CoBrowse has its own recordings tab; the preferences rail is built from `layout/data.ts`,
  `menuHidden` and `extraMenuItems`). Delete.

### 5. Extension points the redesign added

- `frontend/saas/` (alias `Saas/*`) holds SaaS-only UI that saas replaces by path, e.g.
  `saas/frontend/saas/audits/AuditsPage.tsx` (route `/audits`, plan feature `agent-audits`) and
  `saas/frontend/saas/nav/RecordingsMeter.tsx` (nav foot; `Shared/RecordingsMeter/RecordingsMeter`
  takes `captured` / `included` / `resetsOn`).
- Placeholders and where they render now: `Survey` (shell), `Version` (user menu foot), `HealthStatus` and
  `SaasHeaderMenuItems` (nav), `ClientSaas` and `Billing` (preferences), `Dangerzone` (account page),
  `CrispIframe` (support drawer), `NoSessionsMessage` (empty sessions list), `SummaryButton` (devtools strip).
- `SessionsTable` takes a `queue` prop (`useSessionQueue` from `Shared/SessionsDock/openSessions`) for the
  sessions dock's "Add to queue"; any saas list of sessions can pass it.

### 6. Locales

FOSS `app/locales/*.json` were not regenerated for the redesign's new strings (open FOSS item: run
`app/locales/extractTranslations.js`). Saas overwrites all locale files with an older set (80 keys behind, 56
saas-only); re-sync after FOSS regenerates.
