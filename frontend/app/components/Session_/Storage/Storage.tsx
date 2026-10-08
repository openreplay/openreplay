import { JSONTree } from '@/ui/data/JSONTree';
import { Tooltip } from '@/ui/overlays/tooltip';
import {
  STORAGE_TYPES,
  selectStorageList,
  selectStorageListNow,
  selectStorageType,
} from 'Player';
import cn from 'classnames';
import diff from 'microdiff';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { PlayerContext } from 'App/components/Session/playerContext';
import { formatMs } from 'App/date';
import logger from 'App/logger';
import { useStore } from 'App/mstore';

import { NoData } from 'Shared/DevTools/PanelKit';

import Autoscroll from '../Autoscroll';
import BottomBlock from '../BottomBlock/index';
import DiffRow from './DiffRow';
import ReduxViewer from './ReduxViewer';
import stl from './storage.module.css';

function getActionsName(type: string) {
  switch (type) {
    case STORAGE_TYPES.MOBX:
    case STORAGE_TYPES.VUEX:
      return 'MUTATIONS';
    default:
      return 'ACTIONS';
  }
}

const storageDecodeKeys = {
  [STORAGE_TYPES.REDUX]: ['state', 'action'],
  [STORAGE_TYPES.NGRX]: ['state', 'action'],
  [STORAGE_TYPES.VUEX]: ['state', 'mutation'],
  [STORAGE_TYPES.ZUSTAND]: ['state', 'mutation'],
  [STORAGE_TYPES.MOBX]: ['payload'],
  [STORAGE_TYPES.NONE]: ['state, action', 'payload', 'mutation'],
};

function Storage() {
  const { t } = useTranslation();
  const { uiPlayerStore } = useStore();
  const hintIsHidden = uiPlayerStore.hiddenHints.storage;
  const { hideHint } = uiPlayerStore;
  const lastBtnRef = React.useRef<HTMLButtonElement>();
  const [showDiffs, setShowDiffs] = React.useState(false);
  const [stateObject, setState] = React.useState({});

  const { player, store } = React.useContext(PlayerContext);
  const { tabStates, currentTab } = store.get();
  const state = tabStates[currentTab] || {};

  const listNow = selectStorageListNow(state) || [];
  const list = selectStorageList(state) || [];
  const type = selectStorageType(state) || STORAGE_TYPES.NONE;

  React.useEffect(() => {
    let currentState;
    if (listNow.length === 0) {
      currentState = decodeMessage(list[0]);
    } else {
      currentState = decodeMessage(listNow[listNow.length - 1]);
    }
    const stateObj = currentState?.state || currentState?.payload?.state || {};
    const newState = Object.assign(stateObject, stateObj);
    setState(newState);
  }, [listNow.length]);

  const decodeMessage = (msg: any) => {
    const decoded = {};
    const pureMSG = { ...msg };
    const keys = storageDecodeKeys[type];
    try {
      keys.forEach((key) => {
        if (pureMSG[key]) {
          // @ts-ignore TODO: types for decoder
          decoded[key] = player.decodeMessage(pureMSG[key]);
        }
      });
    } catch (e) {
      logger.error('Error on message decoding: ', e, pureMSG);
      return null;
    }
    return { ...pureMSG, ...decoded };
  };

  const decodedList = React.useMemo(
    () => listNow.map((msg) => decodeMessage(msg)),
    [listNow.length],
  );

  const focusNextButton = () => {
    if (lastBtnRef.current) {
      lastBtnRef.current.focus();
    }
  };

  React.useEffect(() => {
    focusNextButton();
  }, []);
  React.useEffect(() => {
    focusNextButton();
  }, [listNow]);

  const renderDiff = (
    item: Record<string, any>,
    prevItem?: Record<string, any>,
  ) => {
    if (!showDiffs) {
      return;
    }

    if (!prevItem) {
      // we don't have state before first action
      return <div style={{ flex: 3 }} className="p-1" />;
    }

    const stateDiff = diff(prevItem.state, item?.state);

    if (!stateDiff) {
      return (
        <div
          style={{ flex: 3 }}
          className="flex flex-col p-2 pr-0 font-mono text-content-disabled"
        >
          {t('No diff')}
        </div>
      );
    }

    return (
      <div style={{ flex: 3 }} className="flex flex-col p-1 font-mono">
        {stateDiff.map((d: Record<string, any>, i: number) =>
          renderDiffs(d, i),
        )}
      </div>
    );
  };

  const renderDiffs = (diff: Record<string, any>, i: number) => {
    const path = diff.path.join('.');
    return (
      <React.Fragment key={i}>
        <DiffRow path={path} diff={diff} />
      </React.Fragment>
    );
  };

  const ensureString = (actionType: string) => {
    if (typeof actionType === 'string') return actionType;
    return 'UNKNOWN';
  };

  const goNext = () => {
    // , list[listNow.length]._index
    player.jump(list[listNow.length].time);
  };

  const renderItem = (
    item: Record<string, any>,
    i: number,
    prevItem?: Record<string, any>,
  ) => {
    let src;
    let name;

    const itemD = item;
    const prevItemD = prevItem || undefined;

    switch (type) {
      case STORAGE_TYPES.REDUX:
      case STORAGE_TYPES.NGRX:
        src = itemD?.action;
        name = src && src.type;
        break;
      case STORAGE_TYPES.VUEX:
        src = itemD?.mutation;
        name = src && src.type;
        break;
      case STORAGE_TYPES.MOBX:
        src = itemD?.payload;
        name = `@${item.type} ${src && src.type}`;
        break;
      case STORAGE_TYPES.ZUSTAND:
        src = null;
        name = itemD?.mutation.join('');
    }

    if (src !== null && !showDiffs && itemD?.state) {
      setShowDiffs(true);
    }

    return (
      <div
        className={cn(
          'flex justify-between items-start',
          src !== null ? 'border-b' : '',
        )}
        key={`store-${i}`}
      >
        {src === null ? (
          <div className="font-mono" style={{ flex: 2, marginLeft: '26.5%' }}>
            {name}
          </div>
        ) : (
          <>
            {renderDiff(itemD, prevItemD)}
            <div
              style={{ flex: 2 }}
              className={cn('flex pt-2', showDiffs && 'pl-10')}
            >
              <JSONTree
                name={ensureString(name)}
                src={src}
                collapsed
                collapseStringsAfterLength={7}
              />
            </div>
          </>
        )}
        <div
          style={{ flex: 1 }}
          className="flex-1 flex gap-2 pt-2 items-center justify-end self-start"
        >
          {typeof item?.duration === 'number' && (
            <div className="text-xs text-content-muted">
              {formatMs(itemD.duration)}
            </div>
          )}
          <div className="w-12">
            {i + 1 < listNow.length && (
              <button
                className={stl.button}
                onClick={() => player.jump(item.time)}
              >
                {t('JUMP')}
              </button>
            )}
            {i + 1 === listNow.length && i + 1 < list.length && (
              <button className={stl.button} ref={lastBtnRef} onClick={goNext}>
                {t('NEXT')}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (type === STORAGE_TYPES.REDUX) {
    return <ReduxViewer />;
  }
  return (
    <BottomBlock>
      {/* @ts-ignore */}
      <>
        <BottomBlock.Header>
          <div className="m-dt__colheads">
            <span style={{ width: '25%' }}>{t('State')}</span>
            {showDiffs ? (
              <span style={{ width: '39%' }}>{t('Diffs')}</span>
            ) : null}
            <span style={{ width: '30%' }}>{getActionsName(type)}</span>
            <span className="ml-auto">
              <Tooltip title={t('Time to execute')}>{t('TTE')}</Tooltip>
            </span>
          </div>
          <span className="m-dt__figrow-note">{t('Current tab')}</span>
        </BottomBlock.Header>
        <BottomBlock.Content className="flex">
          {list.length === 0 ? (
            <NoData
              title={t('Nothing to display yet')}
              hint={
                !hintIsHidden ? (
                  <>
                    {t(
                      'Inspect your application state while you’re replaying your users sessions. OpenReplay supports',
                    )}
                    &nbsp;
                    <a
                      className="m-dt__loglink"
                      href="https://docs.openreplay.com/plugins/redux"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t('Redux')}
                    </a>
                    {', '}
                    <a
                      className="m-dt__loglink"
                      href="https://docs.openreplay.com/plugins/vuex"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t('VueX')}
                    </a>
                    {', '}
                    <a
                      className="m-dt__loglink"
                      href="https://docs.openreplay.com/plugins/pinia"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t('Pinia')}
                    </a>
                    {', '}
                    <a
                      className="m-dt__loglink"
                      href="https://docs.openreplay.com/plugins/zustand"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t('Zustand')}
                    </a>
                    {', '}
                    <a
                      className="m-dt__loglink"
                      href="https://docs.openreplay.com/plugins/mobx"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t('MobX')}
                    </a>
                    {' and '}
                    <a
                      className="m-dt__loglink"
                      href="https://docs.openreplay.com/plugins/ngrx"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t('NgRx')}
                    </a>
                    .
                    <br />
                    <br />
                    <button
                      type="button"
                      className="m-dt__loglink"
                      onClick={() => hideHint('storage')}
                    >
                      {t('Got It!')}
                    </button>
                  </>
                ) : null
              }
            />
          ) : (
            <>
              <div className="ph-10 scroll-y" style={{ width: '25%' }}>
                {list.length === 0 ? (
                  <NoData title={t('Empty state.')} />
                ) : (
                  <JSONTree collapsed={2} src={stateObject} />
                )}
              </div>
              <div className="flex" style={{ width: '75%' }}>
                <Autoscroll className="ph-10">
                  {decodedList.map((item: Record<string, any>, i: number) =>
                    renderItem(item, i, i > 0 ? decodedList[i - 1] : undefined),
                  )}
                </Autoscroll>
              </div>
            </>
          )}
        </BottomBlock.Content>
      </>
    </BottomBlock>
  );
}

export default observer(Storage);

/**
 * TODO: compute diff and only decode the required parts
 * WIP example
 * function useStorageDecryptedList(list: Record<string, any>[], type: string, player: IWebPlayer) {
 *   const [decryptedList, setDecryptedList] = React.useState(list);
 *   const [listLength, setLength] = React.useState(list.length)
 *
 *   const decodeMessage = (msg: any, type: StorageType) => {
 *     const decoded = {};
 *     const pureMSG = { ...msg }
 *     const keys = storageDecodeKeys[type];
 *     try {
 *       keys.forEach(key => {
 *         if (pureMSG[key]) {
 *           // @ts-ignore TODO: types for decoder
 *           decoded[key] = player.decodeMessage(pureMSG[key]);
 *         }
 *       });
 *     } catch (e) {
 *       logger.error("Error on message decoding: ", e, pureMSG);
 *       return null;
 *     }
 *     return { ...pureMSG, ...decoded };
 *   }
 *
 *   React.useEffect(() => {
 *     if (list.length !== listLength) {
 *       const last = list[list.length - 1]._index;
 *       let diff;
 *       if (last < decryptedList[decryptedList.length - 1]._index) {
 *
 *       }
 *       diff = list.filter(item => !decryptedList.includes(i => i._index === item._index))
 *       const decryptedDiff = diff.map(item => {
 *         return player.decodeMessage(item)
 *       })
 *       const result =
 *     }
 *   }, [list.length])
 * }
 *
 * */
