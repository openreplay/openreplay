import * as React from 'react';
import {
  useParams,
  UNSAFE_NavigationContext,
  type Location,
  type NavigateOptions,
  type To,
} from 'react-router';
import {
  useStableLocation as useLocation,
  useStableNavigate,
} from './StableLocationProvider';

export type History = {
  push: (
    to:
      | To
      | { pathname?: string; search?: string; hash?: string; state?: unknown },
  ) => void;
  replace: (
    to:
      | To
      | { pathname?: string; search?: string; hash?: string; state?: unknown },
  ) => void;
  go: (delta: number) => void;
  goBack: () => void;
  goForward: () => void;
  location: Location;
};

export type RouteMatch<Params extends Record<string, string | undefined>> = {
  params: Params;
};

export type RouteComponentProps<
  Params extends Record<string, string | undefined> = Record<
    string,
    string | undefined
  >,
> = {
  history?: History;
  location?: Location;
  match?: RouteMatch<Params>;
};

export function Prompt({
  when,
  message,
}: {
  when: boolean;
  message: string | ((location: Location) => string | boolean);
}) {
  const { navigator } = React.useContext(UNSAFE_NavigationContext) as any;

  React.useEffect(() => {
    if (!when) return;
    if (!navigator || typeof navigator.block !== 'function') return;

    const unblock = navigator.block((tx: any) => {
      const nextLocation = tx.location as Location;
      const result =
        typeof message === 'function' ? message(nextLocation) : message;

      if (result === true) {
        unblock();
        tx.retry();
        return;
      }

      if (result === false) {
        return;
      }

      const ok = typeof window !== 'undefined' ? window.confirm(result) : true;
      if (ok) {
        unblock();
        tx.retry();
      }
    });

    return unblock;
  }, [navigator, when, message]);

  React.useEffect(() => {
    if (!when) return;
    if (typeof window === 'undefined') return;

    const handler = (e: BeforeUnloadEvent) => {
      const result =
        typeof message === 'function' ? message({} as any) : message;
      if (result === false) return;

      e.preventDefault();
      e.returnValue = typeof result === 'string' ? result : '';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [when, message]);

  return null;
}

function resolveTo(
  input:
    | To
    | { pathname?: string; search?: string; hash?: string; state?: unknown },
  location: Location,
): { to: To; options: NavigateOptions } {
  if (typeof input === 'string') {
    return { to: input, options: {} };
  }

  const pathname =
    'pathname' in input && input.pathname != null
      ? input.pathname
      : location.pathname;

  const rawSearch = (input as any).search;
  const rawHash = (input as any).hash;

  const search =
    rawSearch === undefined
      ? location.search
      : rawSearch === ''
        ? ''
        : rawSearch.startsWith('?')
          ? rawSearch
          : `?${rawSearch}`;

  const hash =
    rawHash === undefined
      ? location.hash
      : rawHash === ''
        ? ''
        : rawHash.startsWith('#')
          ? rawHash
          : `#${rawHash}`;
  const state = (input as any).state;

  const toString = `${pathname}${search || ''}${hash || ''}`;
  return {
    to: toString,
    options: state === undefined ? {} : { state },
  };
}

export function useHistory(): History {
  const navigate = useStableNavigate();
  const location = useLocation();
  const locationRef = React.useRef(location);
  locationRef.current = location;

  return React.useMemo<History>(() => {
    return {
      push: (to) => {
        const { to: resolvedTo, options } = resolveTo(
          to as any,
          locationRef.current,
        );
        navigate(resolvedTo, options);
      },
      replace: (to) => {
        const { to: resolvedTo, options } = resolveTo(
          to as any,
          locationRef.current,
        );
        navigate(resolvedTo, { ...options, replace: true });
      },
      go: (delta) => navigate(delta),
      goBack: () => navigate(-1),
      goForward: () => navigate(1),
      get location() {
        return locationRef.current;
      },
    };
  }, [navigate]);
}

export function withRouter<P extends object>(
  Component: React.ComponentType<P & RouteComponentProps<any>>,
): React.ComponentType<P> {
  function WithRouter(props: P) {
    const params = useParams();
    const location = useLocation();
    const history = useHistory();

    return (
      <Component
        {...(props as any)}
        history={history}
        location={location}
        match={{ params } as any}
      />
    );
  }

  WithRouter.displayName = `withRouter(${Component.displayName || Component.name || 'Component'})`;

  return WithRouter;
}
