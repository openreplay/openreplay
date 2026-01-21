# v5-Compat Layer Removal TODO

This document tracks remaining work to fully eliminate the React Router v5 compatibility layer (`v5-compat.tsx`).

## Current Compat Exports

| Export | Purpose | Remaining Usages |
|--------|---------|------------------|
| `withRouter` | HOC injecting `history`, `location`, `match` props | ~20 call-sites |
| `useHistory` | Hook returning v5-style `history` object | ~35 call-sites |
| `Prompt` | Navigation blocking component | Few usages |
| `RouteComponentProps` | Type for components wrapped with `withRouter` | ~15 type usages |
| `History` | Type for the v5-style history object | Several type usages |

---

## Remaining `withRouter` Call-Sites

### HOCs / Utilities (harder — consumers rely on injected props)
- [ ] `components/hocs/withLocationHandlers.js` — class-based HOC, injects query/hash helpers
- [ ] `components/hocs/withSiteIdRouter.js` — wraps components with siteId from route
- [ ] `components/Onboarding/components/withOnboarding.tsx` — injects `skip`/`navTo` helpers

### Dashboard / Metrics
- [ ] `components/Dashboard/NewDashboard.tsx` — uses `history.location.pathname`
- [ ] `components/Dashboard/components/DashboardHeader/DashboardHeader.tsx` — uses `history.push`
- [ ] `components/Dashboard/components/WidgetWrapper/WidgetWrapper.tsx` — uses `history.push`
- [ ] `components/Dashboard/components/WidgetWrapper/WidgetWrapperNew.tsx` — uses `history.push`
- [ ] `components/Dashboard/components/CardUserList/CardUserList.tsx` — uses `history.replace`, `history.location`
- [ ] `components/Dashboard/components/Funnels/FunnelIssuesList/FunnelIssuesList.tsx` — uses `history.replace`, `history.location`
- [ ] `components/Dashboard/components/Alerts/NewAlert.tsx` — uses `history.push`
- [ ] `components/Dashboard/components/Alerts/AlertListItem.tsx` — uses `history.push`
- [ ] `components/Dashboard/components/MetricTypeList/MetricTypeList.tsx` — uses `history.push`
- [ ] `components/Dashboard/components/DashboardWidgetGrid/AddPredefinedMetric.tsx` — uses `history.push`
- [ ] `components/Dashboard/Widgets/CustomMetricsWidgets/CustomMetricTableErrors/CustomMetricTableErrors.tsx` — uses `history.replace`, `history.location`

### Session Views
- [ ] `components/Session_/QueueControls/QueueControls.tsx` — uses `history.push`
- [ ] `components/shared/SessionItem/SessionItem.tsx` — large component, uses `useHistory` + `withRouter`
- [ ] `components/shared/SessionsTabOverview/components/SessionList/SessionList.tsx` — uses `withRouter` (already has `useLocation`)
- [ ] `components/Session/Player/ReplayPlayer/PlayerBlockHeader.tsx` — uses `history.location`
- [ ] `components/ui/NoSessionPermission/NoSessionPermission.tsx` — uses `history.location`

### Settings / Client
- [ ] `components/Client/Client.tsx` — **class component**, uses `this.props.history.push`
- [ ] `components/Client/Sites/NewSiteForm.tsx` — uses route props
- [ ] `components/Overview/Overview.tsx` — uses `withRouter` (already has `useLocation`)

---

## Remaining `useHistory` Call-Sites

Most of these only use `history.push` or `history.replace` and can be converted to `useNavigate`:

- [ ] `components/Spots/SpotPlayer/SpotPlayer.tsx`
- [ ] `components/Spots/SpotPlayer/components/SpotPlayerHeader.tsx`
- [ ] `components/Spots/SpotsList/SpotListItem.tsx`
- [ ] `components/DataManagement/Properties/ListPage.tsx`
- [ ] `components/DataManagement/Properties/UsersWithProp.tsx`
- [ ] `components/DataManagement/Events/index.tsx`
- [ ] `components/DataManagement/UsersEvents/UserPage.tsx`
- [ ] `components/DataManagement/UsersEvents/UsersListPage.tsx`
- [ ] `components/DataManagement/Activity/ActivityPage.tsx`
- [ ] `components/Session/Player/MobilePlayer/MobilePlayerHeader.tsx`
- [ ] `components/Session/Player/MobilePlayer/MobileControls.tsx`
- [ ] `components/Session/Player/ClipPlayer/ClipPlayerControls.tsx`
- [ ] `components/Session/Player/TagWatch/SaveModal.tsx`
- [ ] `components/Session/Player/LivePlayer/LivePlayerBlockHeader.tsx`
- [ ] `components/Session/Player/LivePlayer/AssistSessionsTabs/AssistSessionsTabs.tsx`
- [ ] `components/Session/Player/SharedComponents/BackendLogs/StatusMessages.tsx`
- [ ] `components/Session/LiveSession.js`
- [ ] `components/Session_/Player/Controls/Controls.tsx`
- [ ] `components/Session_/Player/Controls/AssistSessionsTabs/AssistSessionsTabs.tsx`
- [ ] `components/Session_/Multiview/Multiview.tsx`
- [ ] `components/shared/Breadcrumb/BackButton.tsx`
- [ ] `components/shared/SessionItem/PlayLink/PlayLink.tsx`
- [ ] `components/Kai/KaiChat.tsx`
- [ ] `components/Client/Projects/Projects.tsx`
- [ ] `components/Highlights/HighlightsList.tsx`
- [ ] `components/Login/Login.tsx`
- [ ] `components/Dashboard/components/CreateDashboardButton.tsx`
- [ ] `components/Dashboard/components/DashboardView/DashboardView.tsx`
- [ ] `components/Dashboard/components/DashboardList/DashboardList.tsx`
- [ ] `components/Dashboard/components/DashboardList/NewDashModal/CreateCard.tsx`
- [ ] `components/Dashboard/components/DashboardList/NewDashModal/SelectCard.tsx`
- [ ] `components/Dashboard/components/WidgetWrapper/CardMenu.tsx`
- [ ] `components/Dashboard/components/AddCardSection/AddCardSection.tsx`
- [ ] `components/Dashboard/components/MetricListItem/MetricListItem.tsx`
- [ ] `components/Dashboard/components/WidgetView/WidgetView.tsx`
- [ ] `components/Dashboard/components/WidgetView/CardViewMenu.tsx`
- [ ] `components/Dashboard/components/MetricsList/ListView.tsx`
- [ ] `PrivateRoutes.tsx`
- [ ] `components/Dashboard/components/DashboardRouter/DashboardRouter.tsx`
- [ ] `layout/LangBanner.tsx`
- [ ] `components/hocs/withSiteIdUpdater.js`

---

## Remaining `Prompt` Usages

The `<Prompt>` component uses `UNSAFE_NavigationContext` for blocking. To remove it:

- Audit usages (search for `<Prompt`)
- Either remove navigation blocking or migrate to a data router (`createBrowserRouter`) which supports the official blocking API

---

## Conversion Patterns

### `withRouter` → hooks

```tsx
// Before
import { withRouter, RouteComponentProps } from 'App/routing';
function MyComponent(props: RouteComponentProps) {
  props.history.push('/path');
  const id = props.match.params.id;
}
export default withRouter(MyComponent);

// After
import { useNavigate, useParams } from 'App/routing';
function MyComponent() {
  const navigate = useNavigate();
  const { id } = useParams();
  navigate('/path');
}
export default MyComponent;
```

### `useHistory` → `useNavigate` / `useLocation`

```tsx
// Before
import { useHistory } from 'App/routing';
const history = useHistory();
history.push('/path');
history.replace('/path');
history.goBack();
const pathname = history.location.pathname;

// After
import { useNavigate, useLocation } from 'App/routing';
const navigate = useNavigate();
const location = useLocation();
navigate('/path');
navigate('/path', { replace: true });
navigate(-1);
const pathname = location.pathname;
```

### Class components with `withRouter`

For class components like `Client.tsx`:
1. Convert to function component, OR
2. Create a small wrapper that uses hooks and passes them as props

---

## Final Cleanup

Once all usages are removed:

1. Delete `frontend/app/routing/v5-compat.tsx`
2. Remove compat exports from `frontend/app/routing/index.ts`:
   ```ts
   // Remove these lines:
   export { Prompt, useHistory, withRouter } from './v5-compat';
   export type { History, RouteComponentProps } from './v5-compat';
   ```
3. Delete this TODO file
