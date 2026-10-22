export {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  useNavigationType,
  useParams,
} from 'react-router';

export { Prompt, useHistory, useLeaveGuard, withRouter } from './v5-compat';
export type { RouteComponentProps } from './v5-compat';

// Stable hooks that bypass React Router v7 + React 19 excessive re-renders
export {
  LocationSync,
  StableRoutes,
  useStableLocation as useLocation,
  useStableNavigate as useNavigate,
} from './StableLocationProvider';
