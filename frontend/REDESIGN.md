# UI redesign port (shadcn)

Source: `gabelinares/melonade` PR #1, branch `feat/sessions-unified-search-0902`, app `graphite-shadcn/`
(live: melonade-shadcn.vercel.app). Design log `DESIGN.md` (§66 search, §66.8–66.13 replay/queue/picker),
handoff `context/handoff-2026-10-05.md`. The prototype runs on mock data (`src/state`, `shared/`): only views are ported.

## Decisions (2026-10-07)

- Long-lived branch `redesign/shadcn` off `dev`; merge `dev` in regularly; ship when done.
- Prototype Tailwind scale verbatim: `@theme inline` maps spacing / text / radius / colors onto `--m-*` tokens
  (`p-4` = 8px ladder, `text-sm` = 13px, `rounded-md` = control corner). Root font back to 16px.
  Legacy classes change meaning, so unported pages look off until ported.
- Only the shipped variant values: the decided look of 2026-10-14 (melonade #11, #13: white page, Slate sections,
  dark outlines at 50%; Inter / Inter Tight titles / IBM Plex Mono caps tags / Geist Mono figures / JetBrains Mono
  code, all self-hosted from `app/assets/fonts`), accent indigo (melonade #16: same steps as the teal it replaced;
  `mark-*` for status shapes, `pill-on/off-*` for toggle pills), corners soft, density spaced from 1440px
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
- Pieces built from the kit for one product area live with it (`Shared/Celebration`, `Shared/RecordingsMeter`,
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
- `ui/data/SessionAvatar` is the prototype's pixelbot, generated in the browser (`@dicebear/core` + the bundled
  CC0 `pixelbot.json` with OpenReplay's parts, `ui/data/robot.ts`); seeded by identity (`seedFor`: user id, else
  anonymous id), never fetched, so no user id leaves the page.
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
      (`RequestSheetHost`, opened through `uiPlayerStore.openRequestSheet`), X-Ray lanes (every mark is a plain
      dot, frustrations included: the lane names the kind, the tooltip names the event; the per-kind icons were
      dropped on purpose and live on in the grouped popover), performance charts, share dialog, autoplay toast, Features (tag list + tag form), Export E2E panel, Click map list
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
      this-project, key, capture rate, metadata), team (+ member drawer), roles (+ role drawer), audit
      (+ details drawer), integrations (cards; forms still open their own drawers), webhooks (+ drawer),
      exported videos, agents (headings/toggles). Modules and Weekly report are removed, not ported (Mehdi;
      melonade DESIGN §56–57); their old routes redirect to the account page. SaaS placeholders kept mounted: `ClientSaas`, `Billing`,
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

- melonade #4 "The real build reviewed: four designs it asked for" (2026-10-09), all four ported and checked
  with the PR's own `tools/foss-review-check.mjs`, ported to our harness (30/30; the version-faked mock needs
  the notice and the map in separate passes):
  - OR-3742 nothing in the window: `EmptyArt` `window`, `utils/windowPhrase.ts` (years in the app's zone),
    the sessions page names the window, says when the last matching session was (one limit-1 lookup over 30
    days, only while empty) and offers the smallest preset that reaches it; card previews (`NoDataInWindow`)
    and the card's sessions block in the same family
  - OR-3746 a banner is a notice: kit `Notice` gained `warning`, `action`, `onDismiss`; the recording's
    notices sit in `ReplayScreen`'s `notice` slot (`.m-rs__notice`); the tracker one only when the recording's
    tracker is NEWER than the app; the language banner and account alerts are notices inside the page
  - OR-3747 the click map as a tab: rows from the session's own clicks (one per element, ranked), the page
    follows the playhead (resolved from location events) until one is picked, count dots on the page's
    elements (`.m-wf__heat`) while paused there, the hovered row's ringed; the player's `markTargets(null)` no
    longer pauses
  - OR-3748 the strip in groups, then kinds: `Types/session/issueGroups.ts`; a group filters by all its kinds;
    kinds in sentence case beside the picked group (`.m-recs__kinds`); no per-group counts (the API has none)

- melonade #5 "Round two on the real build: widget heights, full screen, one target" (2026-10-09), plus the
  review's other tickets (BACKLOG §29f):
  - a widget is as tall as what it holds: the blanket 240px body height is gone (and `is-natural` with it);
    charts keep their own 240 floor, lists / funnel / vitals end with their content, rows can be ragged; the
    sessions-table widget shows 3 rows like the other lists
  - nothing in the window is one state: `WidgetChart` shows `NoDataInWindow` before an all-zero trend view or
    empty vitals draw (the list kinds already did); in a widget it is two lines ("Widen the window above.",
    `.m-nodata.is-compact`), the builder keeps the window drawing
  - full screen: the timeline's last button enters and, pressed with the collapse glyph, leaves; ⇧F toggles,
    Esc leaves; the ESC bubble (`player-ui/EscapeButton`) is gone; `.m-work.is-fullscreen` is fixed over the
    viewport with the header and side panel hidden; Spot's button got the same labels and toggle
  - the collapsed filter bar is one target: the summary is a button stretched over the section
    (`.m-fchips__expand::after`), the section takes the hover ground, Clear / Save / expand sit above it
  - a feature row lights its element: the player's `markBySelector` only worked in inspector mode (the marker
    was created by `enableInspector`); it now makes an outline-only marker on demand, and an empty selector
    clears the target
  - tickets: journey labels truncate to their column's pitch; chart tooltips go to `<body>` (`appendTo`) so a
    card never clips a breakdown's; "Add breakdown" is `secondary` like "Add series" once one exists; the
    queue dock rests 8px above the panel tab strip; "Show searched events only" left the ⋯ menu (the
    Activity bar has it). The track-under-the-chips ticket did not reproduce: the track ends before them
  - prototype-only, not ported: the pinned first dashboard and `windowHasData` (mock data)

- melonade #6 + #8 "Responsive: three bands" (2026-10-12): `ui/layout/use-viewport.ts` (`wide` ≥ 1080,
  `narrow` 640–1079, `phone` < 640), written on `<html>` as `data-viewport` by `Layout`; every band rule is a
  `:root[data-viewport=…]` selector, wide is untouched. The shell at phone is a bar (menu button, mark) and the
  rail opens as the left drawer (replaces the UA `mobileScreen` check and its floating button). Kit table:
  `Column.priority` 1/2/3 (narrow drops 3, phone keeps 1; undeclared tables keep first and last at phone);
  sessions table and Issues declare tiers, the sessions row at phone is two lines, metadata narrows to one chip
  at narrow. `PageCard` meta rides the title's line (`.m-page__titlerow`); heads wrap at narrow, the detail
  head is a nav bar at phone, the card page one column. Strip and dev-tools strip scroll on one line, the pager
  drops "go to", the replay header is one line (back arrow only, no meta, no queue arrows), the side panel is a
  bottom sheet at 62%, the timeline drops the total clock (clock and settings now show at every width).
  Width menu items hide below wide (the grid is one column there). Support in the nav is the kit popover
  (OR-3771) with a "Chat with us" row that opens the drawer (and its `CrispIframe`) when `CRISP_KEY` is set.
  Add breakdown is `secondary`, like Add series. Not ported: the 1240px rule that hides the replay panel
  between 640 and 1240 (tier 5 in the design too), the prototype panel.
- melonade #7 "The strip, undone": the sessions strip is one level of kinds again, sentence case
  (`Types/session/issueKinds.ts`); the groups and the kinds row are gone, a tag filters by itself.
- melonade #9 "Four answers from the 10-12 call": the queue dock opens after a 220ms held hover; the project
  picker is one line on the nav row height with no border; filter words are "Filters" / "Group properties"
  ("Add filter", "Search group properties", "1 filter"), the catalogue's event-property category is "Event";
  System health is an icon in the footer row (open source only) instead of its own line. Also from the call:
  "Your sessions will appear here soon" is the list's own centered empty state with Troubleshoot and Complete
  setup.
- melonade #10 to #17: see the phase commits (the look, accent tokens, Share session, PR #17's batch).
- melonade #18 "Segments": OR-3842 (free events order, the issues chip) and OR-3844 (a saved search folds
  into `SegmentIndicator`).
- melonade #19 "The illustration gallery" + #20 "Avatars: pixelbot drawn locally" (ported 10-21): the kit in
  `ui/illustrations/` (`ink`, `Inked`, `Aura`, `Bot`, `Illustration`, props, subjects; robots wear a pixelbot
  face) and `ui/data/{avatar,robot,SessionAvatar}`. The cube robot avatar (OR-3841) is gone: every avatar is
  the pixelbot, the replay header's at 28px. Celebration robots blink and cheer with pixelbot's own eyes and
  mouths. Not ported: the gallery page and the stories (prototype tools).
- melonade #21 "CoBrowse: presence dot, live robots, recordings like every other list" (ported 10-21): a live
  row is its avatar (no "live" chip): the robot blinks and smiles (frames over the chip's ground, offset by
  hue, still under reduced motion) and a corner dot says active / inactive (`session.active`), with the words
  as tooltip and screen-reader text, on every list and in the replay header. Session and Metadata share the
  row's leftover width; a table tag runs to 16rem. Cheeks one row lower. Recordings: the sessions table's
  parts (Recording, Recorded by, Duration in-page sort, Recorded via the API's order, the play cell with
  Rename / Delete on hover), All / My recordings; a call opens on the replay screen (`RecordingPlayer`: the
  signed video, Open the session, Rename / Delete). Not ported: the Visitor column and per-scope counts (the
  records API has neither the visitor nor counts).
- melonade #22 "Product analytics interaction, Add card picker, illustrated empty states" (ported 10-21):
  every `EmptyState` draws its entry from `ui/illustrations/states` (by `state`, else its title in the reader's
  language; computed titles pass their state), robots face-only with ground shadows. On a dashboard the data is
  the control: the widget body is a plain container; a datum (ranked row, trend point, funnel stage, journey
  node, vital, big number) drills as on the card page and opens the card already drilled
  (`dashboardStore.carryDrill`: the dashboard's charts reset the drill as they unmount, so the card's own
  chart applies it). A ranked row / stage hovers like a table row; a bar's track is its own hue at 14%. A
  drilled table card says what its list is ("Sessions that visited /pricing", the count) and offers Open in
  Sessions for pages, countries, browsers, devices and users. The width menu follows what is drawn
  (OR-3853). One Add card per dashboard (the empty state has none); a new dashboard can start empty. The
  card picker is a filter menu: the search on top with the step's back chip, Create a new card as a second
  step, skeleton rows while loading, one 24rem size, a footer. Display menu select 10rem, one line. Not
  ported: the drill's share "% of the card" (the sessions list has no card total) and the prototype's mock
  `drillSessionsOf` (the API already returns the datum's sessions).

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
| `app/components/Signup/Signup.tsx` | the install check (failing first, dimmed recheck, celebration, no Sign in corner) and an `aside` slot on `AuthScreen` (`Saas/auth/SignupAside`) | keep saas's no-gate version, pass `aside={<SignupPitch />}`, drop the plan list under the form (section 7, task 4) |
| `app/layout/HeaderBanners.tsx` (new override) | FOSS still renders `account.alerts` inside the page | override without `AlertsBanner` once `saas/layout/AppBanners.tsx` shows them (section 7, task 3) |

### 3. Overrides that import FOSS modules removed by the redesign

| saas override | missing FOSS imports | action |
|---|---|---|
| `Client/Integrations/SlackForm.tsx` | `./SlackAddForm`, `./SlackChannelList/*` | delete: FOSS `SlackForm` / `Teams` now render `MessengerForm` (list, add, edit, delete, kit drawer) |
| `Client/Integrations/Integrations.tsx` | `IntegrationFilters`, `IntegrationItem` (categories are sections now) | re-apply the saas delta on the new FOSS file: GitHub connects through `auth.openreplay.com` OAuth (`onOauthClick`) instead of `GithubForm`; `hideHeader` prop for the onboarding embed. FOSS already handles disconnecting an `oauth` integration with a confirm. FOSS also dropped the page-level project select: backend-logging drawers pick their projects (`BackendIntegrationDrawer`), plugin drawers pick the project whose key they show (`PluginPane`), and cards show "Connected · n projects" from `integrationsByProject`. Take the new card copy and drop the saas select too |
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
- `app/layout/nav/NavSupport.tsx` (default export, no props) is the nav foot's help: the "?" in the tools
  row and everything it opens (FOSS: the support popover, plus a "Chat with us" row opening `SupportModal`
  with `CrispIframe` when `CRISP_KEY` is set). Saas can replace the file by path, e.g. with a modal; a
  replacement renders one trigger with the `m-nav__tool` class.
- `SessionsTable` takes a `queue` prop (`useSessionQueue` from `Shared/SessionsDock/openSessions`) for the
  sessions dock's "Add to queue"; any saas list of sessions can pass it.
- `Shared/RecordingsMeter/RecordingsMeter` (`onUpgrade`), `@/ui/feedback/Banner`, `@/ui/inputs/RangeSlider`,
  `Saas/billing/PayAsYouGo`, `Components/Auth/SignupPitch` and the `saas/layout/AppBanners.tsx` /
  `saas/auth/SignupAside.tsx` slots came with melonade PR #17: see section 7 for wiring them.

### 6. Locales

FOSS owns every string in `app/` and `saas/` (the extractor reads both). Saas no longer ships locale files:
`saas/frontend/saas-locales/<lng>.json` holds only its diff (`add` for saas-only strings, `override` for FOSS keys
it words differently), and `merge-locales.js` (run by the makefile after `mod-package.js`) merges it onto these
files, warning when an added key has since reached FOSS or a placeholder doesn't match. A FOSS string that needs
translating goes here, not into a saas override.

### 7. Melonade PR #17: the SaaS tasks (agent checklist)

Written to be run by an agent when saas is deployed on this branch. Saas repo:
`~/Documents/work/work/saas/saas/frontend` (overlays `frontend/` by path). Linear: OR-3807, OR-3808, OR-3834,
OR-3809, OR-3810, plus the SaaS halves of OR-3831 and OR-3835. Design source: gabelinares/melonade PR #17
(`DESIGN.md` §83.6-§83.9, §85.1, §87), branch `onboarding/install-status-1016`. Every string through `t()`,
no em dashes in UI copy, kit components only (no antd).

**Data the saas side already has** (use these, do not invent fields):
- `userStore.account.verifiedEmail`, `userStore.account.email`, `userStore.resendEmailVerification(email)`
  (today in `app/components/Header/SaasHeaderMenuItems/SaasHeaderMenuItems.tsx`, the `VerifyEmail` tool).
- `userStore.account.plan`: `type` (`FREE` / `TRIAL` from `Types/plan`), `billingSetup`, `remainingTrialDays`;
  `billingStore.instance.hasActivePlan` (today in
  `app/components/Header/components/TrialNotification/TrialNotification.tsx`).
- `billingStore.fetchPlan()`, `billingStore.instance.current.recordedSessions` (the plan's limit),
  `.count.capturedSessions`, `.billing.nextBillingDate` (today in `saas/nav/RecordingsMeter.tsx`).
- `userStore.account.alerts` (`{ text, level, button, url }[]`): the account announcements. FOSS renders them
  inside the page with `app/layout/AlertsBanner.tsx` (via `app/layout/HeaderBanners.tsx`).
- `app/components/Client/Billing/PaymentInformation.tsx`: the card form, today opened in a modal titled
  "Billing details" from `TrialNotification`.

**Task 1. Recordings counter** (OR-3807, OR-3836)
- Edit `saas/nav/RecordingsMeter.tsx`. Render only when `plan.type === TRIAL` or `plan.type === FREE` (free
  is 1,000 a month, the trial 50,000 for a week) and there is no active paid plan; otherwise `null`.
- Pass `onUpgrade` to `Shared/RecordingsMeter/RecordingsMeter`: it opens Set up billing (task 2) where you are.
- FOSS already draws the rest: red bar, figures and edge from 90%; "Limit reached" on a red tint at 100% with
  the tooltip "All N recordings used. New sessions are not recorded until <date>, or until you upgrade.";
  a 24px upgrade control 2px clear of the edge that hovers red; hidden on the collapsed rail.
- Done when: free at 500/1000 is neutral with the upgrade control; 950/1000 is red; 1000/1000 says "Limit
  reached"; a paid plan shows nothing; upgrade opens billing without leaving the page.

**Task 2. Set up billing, pay as you go** (OR-3808, OR-3834)
- Turn the `PaymentInformation` modal into the slide-out Update card uses (`EntityDrawer` from
  `@/ui/overlays/EntityDrawer`), with a `setup` mode: title "Set up billing".
- At the top, `<PayAsYouGo />` from `Saas/billing/PayAsYouGo` (FOSS file, saas may override): "$5.95 per
  1,000 sessions", sessions kept 30 days, a "See pricing" link (openreplay.com/pricing), and "Estimate my
  cost" which opens a `RangeSlider` over 1K, 5K, 10K, 25K, 50K, 100K, 250K, 500K, 1M sessions a month and the
  monthly estimate (100,000 is $595.00). The estimate chooses nothing; billing is only the card. The prepaid
  tiers (10K to 250K at $420 per 50K) are gone.
- Then the existing card form (the card that fills as you type, Link, the address). The primary button reads
  "Start plan"; success toast "Billing set up. <brand> ending <last4> pays as you go."; afterwards the plan is
  paid, so the counter (task 1) and the billing banner item (task 3) go.
- Every "Set up billing" entry point opens this same slide-out: the counter's upgrade, the banner item, and
  Preferences > Billing.
- Done when: the slider moves stop to stop by keyboard and pointer, the estimate updates, Start plan stays
  disabled until the card is complete.

**Task 3. Banners above the app** (OR-3809)
- Edit `saas/layout/AppBanners.tsx` (FOSS mounts it above the whole shell; the shell takes what is left of the
  window, so a banner pushes the app down and never covers it). Build with `Banner`, `BannerItem`,
  `BannerAction` from `@/ui/feedback/Banner` (36px strip in the status chips' tints; `tone` danger | info |
  neutral; `onDismiss` adds the X).
- Announcement first, and it takes precedence over the first-user banner: from `account.alerts`. Level
  alert / error is `danger` with no dismiss (stays until the reason is gone), e.g. "Your account is paused.
  The October invoice is unpaid, so new sessions are not being recorded." with "Pay the invoice"; anything
  else is `info` with a dismiss for this visit (maintenance with its status-page link). The alert's `button`
  + `url` become a `BannerAction href`.
- Then stop rendering the alerts inside the page: override `app/layout/HeaderBanners.tsx` without
  `AlertsBanner` (keep `LangBanner`), so an alert never shows twice.
- First-user banner, `neutral`, when there is no announcement: up to two `BannerItem`s with a rule between.
  "Verify your email. The link went to <email>." with "Resend" (calls `resendEmailVerification`, toast
  "Verification email sent to <email>") while `!verifiedEmail`; "No active plan yet." (or the trial's days
  left) with "Set up billing" (opens task 2) while on TRIAL / FREE without `billingSetup`. Each item goes away
  when done; the strip goes with the last one.
- Remove the now duplicated nav tools: `VerifyEmail` and `TrialNotification` in `SaasHeaderMenuItems.tsx`
  (keep the free plan's upgrade-to-pay-as-you-go confirm if it is still wanted, as a banner action or a
  menu row).
- Done when: danger has no X and survives a reload; info dismisses; the side nav's foot stays on screen with a
  banner up; phone width wraps the items without overflow.

**Task 4. Cloud signup text column** (OR-3810)
- Saas overrides `app/components/Signup/Signup.tsx`. Merge with FOSS: keep saas's choices (no installation
  health gate, no tenants redirect), pass `aside={<SignupPitch />}` (from `Components/Auth/SignupPitch`) to
  `AuthScreen`, and drop the old plan summary under the form (the pitch replaces it). If saas stops
  overriding `Signup.tsx`, put `return <SignupPitch />` in `saas/auth/SignupAside.tsx` instead.
- The pitch: "Start with 1,000 recordings a month, free.", three lines with 28px icon tiles (MonitorPlay,
  Search, the Armada mark), "No card needed. Set up billing when you need more." It sits on the page ground
  left of the card and stacks above it below 860px.
- Done when: desktop shows the column beside the card; 800px stacks it; the form still submits.

**Task 5. Audits page** (`saas/audits/AuditsPage.tsx`; OR-3831, OR-3835)
- The page header holds only search and the main button; the ••• menu moves to the list's toolbar line, after
  the display menu.
- Page the list with the shared rows choice: `useRowsPerPage()` / `setRowsPerPage()` from
  `@/ui/layout/rows-per-page`, and `ListFooter` with `onPageSize` (10 / 50 / 100, shown once the list is longer
  than 10). Rows use `DataTable`'s default `list-row-height`.
- Billing's invoices are a Preferences list: keep their fixed 10 (`Invoices.tsx`), no change.

**Task 6. Checks after wiring**
- `yarn install` with `mod-package.js` applied, then the production build
  (`NODE_ENV=production VITE_USER_NODE_ENV=production node node_modules/vite/bin/vite.js build`) and
  `node node_modules/typescript/bin/tsc --noEmit -p .` filtered to the touched files.
- Walk: free account (counter, banner items, upgrade into billing, estimate, Start plan), a verified paid
  account (no counter, no banner), an account with a danger alert, signup at 1440 and 800 px, Audits paging.
- Locales: new strings from this round (banner, billing, pitch, counter) need extracting into the saas locale
  set too (section 6).
