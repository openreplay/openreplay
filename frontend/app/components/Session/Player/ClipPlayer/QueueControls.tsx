import React, { useEffect } from 'react';
import cn from 'classnames';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { Button, Popover } from 'antd';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import AutoplayToggle from 'Shared/AutoplayToggle';
import { useTranslation } from 'react-i18next';
// import AutoplayToggle from "Components/Session/Player/ClipPlayer/AutoplayToggle";

interface Props {}

function QueueControls(props: Props) {
  const { t } = useTranslation();
  const { clipStore, projectsStore, sessionStore, searchStore } = useStore();
  const previousId = clipStore.prevId;
  const { nextId } = clipStore;

  const nextHandler = () => {
    clipStore.next();
  };

  const prevHandler = () => {
    clipStore.prev();
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
          mouseEnterDelay={1}
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
      <div onClick={nextHandler} className={cn('p-1 group ml-1 rounded-full')}>
        <Popover
          placement="bottom"
          content={
            <div className="whitespace-nowrap">{t('Play Next Session')}</div>
          }
          open={nextId ? undefined : false}
          mouseEnterDelay={1}
        >
          <Button
            size="small"
            shape="circle"
            // disabled={!nextId}
            className="flex items-center justify-center"
          >
            <RightOutlined />
          </Button>
        </Popover>
      </div>
    </div>
  );
}

export default observer(QueueControls);
