import type Session from 'Types/session';
import type { MouseEvent } from 'react';
import { useEffect, useRef } from 'react';

import { PAGE, prefetchRoute } from 'App/layout/nav/prefetchRoutes';
import { useStore } from 'App/mstore';
import { session as sessionRoute, withSiteId } from 'App/routes';
import { useHistory } from 'App/routing';

const HOVER_INTENT_MS = 150;

/** Row → replay, warming the first mob on hover like the old PlayLink did. */
export function useOpenSession() {
  const { sessionStore, projectsStore } = useStore();
  const history = useHistory();
  const warmed = useRef(new Set<string>());
  const pending = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(pending.current), []);

  /** Pointer resting on a row (null when it leaves): after a short pause, warm
   *  the replay chunk and the session's first mob. Sweeping across rows warms nothing. */
  const hover = (s: Session | null) => {
    clearTimeout(pending.current);
    if (!s || s.live || s.isMobile || warmed.current.has(s.sessionId)) return;
    pending.current = setTimeout(() => {
      warmed.current.add(s.sessionId);
      prefetchRoute(PAGE.REPLAY);
      sessionStore.getFirstMob(s.sessionId).catch(() => {
        warmed.current.delete(s.sessionId);
      });
    }, HOVER_INTENT_MS);
  };

  const open = (s: Session, e?: MouseEvent) => {
    const link = withSiteId(
      sessionRoute(s.sessionId),
      projectsStore.getSiteId().siteId!,
    );
    if (e && (e.ctrlKey || e.shiftKey || e.metaKey)) {
      window.open(link, '_blank');
      return;
    }
    if (warmed.current.has(s.sessionId)) sessionStore.prefetchSession(s);
    history.push(link);
  };

  return { open, hover };
}
