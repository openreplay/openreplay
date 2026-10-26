import { IconButton } from '@/ui/actions/IconButton';
import { getRowsPerPage } from '@/ui/layout/rows-per-page';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { session as sessionRoute, withSiteId } from 'App/routes';
import { RouteComponentProps, withRouter } from 'App/routing';

interface Props extends RouteComponentProps {
  defaultList: any;
  latestRequestTime: any;
  sessionIds: any;
}

function QueueControls(props: Props) {
  const { t } = useTranslation();
  const { projectsStore, sessionStore, searchStore } = useStore();
  const { previousId } = sessionStore;
  const { nextId } = sessionStore;
  const { total } = sessionStore;
  const sessionIds = sessionStore.sessionIds ?? [];
  const { setAutoplayValues } = sessionStore;
  const {
    match: {
      // @ts-ignore
      params: { sessionId },
    },
  } = props;

  const { currentPage } = searchStore;
  const currentId = sessionStore.current.sessionId;

  // prev/next point around the loaded session, so redo this on every hop
  useEffect(() => {
    setAutoplayValues();
    const perPage = getRowsPerPage('sessions');
    const totalPages = Math.ceil(total / perPage);
    const index = sessionIds.indexOf(sessionId);

    // sync the page number and refetch list when user navigates into next-page sessions
    const sessionPage = Math.floor(index / perPage) + 1;
    if (sessionPage > 1 && currentPage < sessionPage) {
      searchStore.updateCurrentPage(currentPage + sessionPage - 1);
    }

    if (currentPage !== totalPages && index === sessionIds.length - 1) {
      sessionStore.fetchAutoplayList(currentPage + 1).then(setAutoplayValues);
    }
  }, [currentId]);

  const nextHandler = () => {
    const siteId = projectsStore.getSiteId().siteId!;
    props.history.push(withSiteId(sessionRoute(nextId), siteId));
  };

  const prevHandler = () => {
    const siteId = projectsStore.getSiteId().siteId!;
    props.history.push(withSiteId(sessionRoute(previousId), siteId));
  };

  return (
    <span className="m-rs__queue">
      <IconButton
        icon={<ChevronLeft size={15} />}
        label={t('Play previous session')}
        variant="ghost"
        disabled={!previousId}
        onClick={prevHandler}
      />
      <IconButton
        icon={<ChevronRight size={15} />}
        label={t('Play next session')}
        variant="ghost"
        disabled={!nextId}
        onClick={nextHandler}
      />
    </span>
  );
}

export default withRouter(observer(QueueControls));
