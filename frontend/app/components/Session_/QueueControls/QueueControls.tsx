import { IconButton } from '@/ui/actions/IconButton';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { session as sessionRoute, withSiteId } from 'App/routes';
import { RouteComponentProps, withRouter } from 'App/routing';

const PER_PAGE = 10;

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

  useEffect(() => {
    setAutoplayValues();
    const totalPages = Math.ceil(total / PER_PAGE);
    const index = sessionIds.indexOf(sessionId);

    // sync the page number and refetch list when user navigates into next-page sessions
    const sessionPage = Math.floor(index / PER_PAGE) + 1;
    if (sessionPage > 1 && currentPage < sessionPage) {
      searchStore.updateCurrentPage(currentPage + sessionPage - 1);
    }

    if (currentPage !== totalPages && index === sessionIds.length - 1) {
      sessionStore.fetchAutoplayList(currentPage + 1).then(setAutoplayValues);
    }
  }, []);

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
