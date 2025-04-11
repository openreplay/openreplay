import React, { useEffect } from 'react';
import { withSiteId, session as sessionRoute } from 'App/routes';
import AutoplayToggle from 'Shared/AutoplayToggle/AutoplayToggle';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import cn from 'classnames';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { Button, Popover } from 'antd';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';

const PER_PAGE = 10;

interface Props extends RouteComponentProps {
  defaultList: any;
  currentPage: number;
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
    <div className="flex items-center gap-1">
      <div
        onClick={prevHandler}
        className={cn('p-1 group rounded-full', {
          'pointer-events-none opacity-50': !previousId,
          'cursor-pointer': !!previousId,
        })}
      >
        <Popover
          placement="bottom"
          content={
            <div className="whitespace-nowrap">
              {t('Play Previous Session')}
            </div>
          }
          open={previousId ? undefined : false}
        >
          <Button
            size="small"
            shape="circle"
            disabled={!previousId}
            className="flex items-center justify-center"
          >
            <LeftOutlined />
          </Button>
        </Popover>
      </div>
      <AutoplayToggle />
      <div
        onClick={nextHandler}
        className={cn('p-1 group ml-1 rounded-full', {
          'pointer-events-none opacity-50': !nextId,
          'cursor-pointer': !!nextId,
        })}
      >
        <Popover
          placement="bottom"
          content={
            <div className="whitespace-nowrap">{t('Play Next Session')}</div>
          }
          open={nextId ? undefined : false}
        >
          <Button
            size="small"
            shape="circle"
            disabled={!nextId}
            className="flex items-center justify-center"
          >
            <RightOutlined />
          </Button>
        </Popover>
      </div>
    </div>
  );
}

export default withRouter(observer(QueueControls));
