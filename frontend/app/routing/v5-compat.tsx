import * as React from 'react';
import {
  type Location,
  type NavigateOptions,
  type To,
  UNSAFE_NavigationContext,
  createPath,
  useBeforeUnload,
  useParams,
} from 'react-router';

import {
  useStableLocation as useLocation,
  useStableNavigate,
} from './StableLocationProvider';

export type History = {
  push: (to: PathInput) => void;
  replace: (to: PathInput) => void;
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

type PromptMessage = string | ((location: Location) => string | boolean);

/** Asked before an in-app navigation; false keeps the current page.
 *  `proceed` makes the held navigation later, past every blocker. */
const blockers = new Set<(next: Location, proceed: () => void) => boolean>();

/* BrowserRouter's history in react-router 7 has no block(), so Prompt wraps
   its push / replace (what Link, useNavigate and useHistory end in) once.
   Back / forward and the browser's own navigations are not asked. */
function guardNavigator(navigator: any) {
  if (navigator.__guarded) return;
  navigator.__guarded = true;
  for (const key of ['push', 'replace'] as const) {
    const navigate = navigator[key].bind(navigator);
    navigator[key] = (to: To, ...rest: unknown[]) => {
      const next = navigator.encodeLocation(to) as Location;
      const proceed = () => navigate(to, ...rest);
      for (const allow of blockers) if (!allow(next, proceed)) return;
      navigate(to, ...rest);
    };
  }
}

export function Prompt({
  when,
  message,
}: {
  when: boolean;
  message: PromptMessage;
}) {
  const { navigator } = React.useContext(UNSAFE_NavigationContext) as any;
  const messageRef = React.useRef(message);
  messageRef.current = message;

  React.useEffect(() => {
    if (!when || !navigator) return;
    guardNavigator(navigator);

    const allow = (next: Location) => {
      const msg = messageRef.current;
      const result = typeof msg === 'function' ? msg(next) : msg;
      return typeof result === 'boolean' ? result : window.confirm(result);
    };
    blockers.add(allow);
    return () => {
      blockers.delete(allow);
    };
  }, [navigator, when]);

  // a reload or a closed tab has no next location to ask the message about;
  // the browser shows its own wording
  useBeforeUnload(
    React.useCallback(
      (e: BeforeUnloadEvent) => {
        if (when) e.preventDefault();
      },
      [when],
    ),
  );

  return null;
}

/**
 * Holds an in-app navigation while `when`, for a dialog to decide on:
 * `leave()` makes it, `stay()` drops it. `allowTo` lets some destinations
 * through unasked. A reload or a closed tab gets the browser's own prompt.
 */
export function useLeaveGuard(
  when: boolean,
  allowTo?: (next: Location) => boolean,
) {
  const { navigator } = React.useContext(UNSAFE_NavigationContext) as any;
  const [pending, setPending] = React.useState<(() => void) | null>(null);
  const allowRef = React.useRef(allowTo);
  allowRef.current = allowTo;

  React.useEffect(() => {
    if (!when || !navigator) return;
    guardNavigator(navigator);
    const allow = (next: Location, proceed: () => void) => {
      if (allowRef.current?.(next)) return true;
      setPending(() => proceed);
      return false;
    };
    blockers.add(allow);
    return () => {
      blockers.delete(allow);
    };
  }, [navigator, when]);

  useBeforeUnload(
    React.useCallback(
      (e: BeforeUnloadEvent) => {
        if (when) e.preventDefault();
      },
      [when],
    ),
  );

  return {
    open: pending != null,
    leave: () => {
      const go = pending;
      setPending(null);
      go?.();
    },
    stay: () => setPending(null),
  };
}

type PathInput =
  | To
  | { pathname?: string; search?: string; hash?: string; state?: unknown };

/** An object keeps the parts of the current path it leaves out (v5 kept only the pathname). */
function resolveTo(
  input: PathInput,
  location: Location,
): { to: To; options: NavigateOptions } {
  if (typeof input === 'string') return { to: input, options: {} };
  const p = input as Exclude<PathInput, string> & { state?: unknown };
  return {
    to: createPath({
      pathname: p.pathname ?? location.pathname,
      search: p.search ?? location.search,
      hash: p.hash ?? location.hash,
    }),
    options: p.state === undefined ? {} : { state: p.state },
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
        const { to: resolvedTo, options } = resolveTo(to, locationRef.current);
        navigate(resolvedTo, options);
      },
      replace: (to) => {
        const { to: resolvedTo, options } = resolveTo(to, locationRef.current);
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
