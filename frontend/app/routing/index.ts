export {
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation as useRouterLocation,
  useNavigate as useRouterNavigate,
  useNavigationType,
  useParams,
  useMatch,
  useSearchParams,
  matchPath,
  type Location,
  type NavigateOptions,
  type To,
} from 'react-router';

export { BrowserRouter, Link, NavLink } from 'react-router';
export type { LinkProps, NavLinkProps } from 'react-router';

export { Prompt, useHistory, withRouter } from './v5-compat';
export type { History, RouteComponentProps } from './v5-compat';

// Stable hooks that bypass React Router v7 + React 19 excessive re-renders
export {
  LocationSync,
  StableRoutes,
  useStableLocation as useLocation,
  useStableNavigate as useNavigate,
} from './StableLocationProvider';
