import React from 'react';
import { connect } from 'react-redux';
import { hideHint } from 'Duck/components/player';
import { PlayerContext } from 'App/components/Session/playerContext';
import { observer } from 'mobx-react-lite';
import { JSONTree, NoContent, Tooltip } from 'UI';
import { formatMs } from 'App/date';
// @ts-ignore
import { diff } from 'deep-diff';
import { STORAGE_TYPES, selectStorageList, selectStorageListNow, selectStorageType } from 'Player';
import Autoscroll from '../Autoscroll';
import BottomBlock from '../BottomBlock/index';
import DiffRow from './DiffRow';
import cn from 'classnames';
import stl from './storage.module.css';
import logger from "App/logger";

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
}
interface Props {
  hideHint: (args: string) => void;
  hintIsHidden: boolean;
}

function Storage(props: Props) {
  const lastBtnRef = React.useRef<HTMLButtonElement>();
  const [showDiffs, setShowDiffs] = React.useState(false);
  const [stateObject, setState] = React.useState({});

  const { player, store } = React.useContext(PlayerContext);
  const { tabStates, currentTab } = store.get()
  const state = tabStates[currentTab] || {}

  const listNow = selectStorageListNow(state) || [];
  const list = selectStorageList(state) || [];
  const type = selectStorageType(state) || STORAGE_TYPES.NONE

  React.useEffect(() => {
    let currentState;
    if (listNow.length === 0) {
      currentState = decodeMessage(list[0])
    } else {
      currentState = decodeMessage(listNow[listNow.length - 1])
    }
    const stateObj = currentState?.state || currentState?.payload?.state || {}
    const newState = Object.assign(stateObject, stateObj);
    setState(newState);

  }, [listNow.length]);

  const decodeMessage = (msg: any) => {
    const decoded = {};
    const pureMSG = { ...msg }
    const keys = storageDecodeKeys[type];
    try {
      keys.forEach(key => {
        if (pureMSG[key]) {
          // @ts-ignore TODO: types for decoder
          decoded[key] = player.decodeMessage(pureMSG[key]);
        }
      });
    } catch (e) {
      logger.error("Error on message decoding: ", e, pureMSG);
      return null;
    }
    return { ...pureMSG, ...decoded };
  }

  const decodedList = React.useMemo(() => {
    return listNow.map(msg => {
      return decodeMessage(msg)
    })
  }, [listNow.length])

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

  const renderDiff = (item: Record<string, any>, prevItem?: Record<string, any>) => {
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
        <div style={{ flex: 3 }} className="flex flex-col p-2 pr-0 font-mono text-disabled-text">
          No diff
        </div>
      );
    }

    return (
      <div style={{ flex: 3 }} className="flex flex-col p-1 font-mono">
        {stateDiff.map((d: Record<string, any>, i: number) => renderDiffs(d, i))}
      </div>
    );
  };

  const renderDiffs = (diff: Record<string, any>, i: number) => {
    const path = createPath(diff);
    return (
      <React.Fragment key={i}>
        <DiffRow path={path} diff={diff} />
      </React.Fragment>
    );
  };

  const createPath = (diff: Record<string, any>) => {
    let path: string[] = [];

    if (diff.path) {
      path = path.concat(diff.path);
    }
    if (typeof diff.index !== 'undefined') {
      path.push(diff.index);
    }

    const pathStr = path.length ? path.join('.') : '';
    return pathStr;
  };

  const ensureString = (actionType: string) => {
    if (typeof actionType === 'string') return actionType;
    return 'UNKNOWN';
  };

  const goNext = () => {
    // , list[listNow.length]._index
    player.jump(list[listNow.length].time);
  };

  const renderItem = (item: Record<string, any>, i: number, prevItem?: Record<string, any>) => {
    let src;
    let name;

    const itemD = item
    const prevItemD = prevItem ? prevItem : undefined

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
        className={cn('flex justify-between items-start', src !== null ? 'border-b' : '')}
        key={`store-${i}`}
      >
        {src === null ? (
          <div className="font-mono" style={{ flex: 2, marginLeft: '26.5%' }}>
            {name}
          </div>
        ) : (
          <>
            {renderDiff(itemD, prevItemD)}
            <div style={{ flex: 2 }} className={cn("flex pt-2", showDiffs && 'pl-10')}>
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
            <div className="font-size-12 color-gray-medium">{formatMs(itemD.duration)}</div>
          )}
          <div className="w-12">
            {i + 1 < listNow.length && (
              <button className={stl.button} onClick={() => player.jump(item.time)}>
                {'JUMP'}
              </button>
            )}
            {i + 1 === listNow.length && i + 1 < list.length && (
              <button className={stl.button} ref={lastBtnRef} onClick={goNext}>
                {'NEXT'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const { hintIsHidden } = props;

  return (
    <BottomBlock>
      <BottomBlock.Header>
        {list.length > 0 && (
          <div className="flex w-full">
            <h3 style={{ width: '25%', marginRight: 20 }} className="font-semibold">
              {'STATE'}
            </h3>
            {showDiffs ? (
              <h3 style={{ width: '39%' }} className="font-semibold">
                DIFFS
              </h3>
            ) : null}
            <h3 style={{ width: '30%' }} className="font-semibold">
              {getActionsName(type)}
            </h3>
            <h3 style={{ paddingRight: 30, marginLeft: 'auto' }} className="font-semibold">
              <Tooltip title="Time to execute">TTE</Tooltip>
            </h3>
          </div>
        )}
      </BottomBlock.Header>
      <BottomBlock.Content className="flex">
        <NoContent
          title="Nothing to display yet"
          subtext={
            !hintIsHidden ? (
              <>
                {
                  'Inspect your application state while you’re replaying your users sessions. OpenReplay supports '
                }
                <a
                  className="underline color-teal"
                  href="https://docs.openreplay.com/plugins/redux"
                  target="_blank"
                >
                  Redux
                </a>
                {', '}
                <a
                  className="underline color-teal"
                  href="https://docs.openreplay.com/plugins/vuex"
                  target="_blank"
                >
                  VueX
                </a>
                {', '}
                <a
                  className="underline color-teal"
                  href="https://docs.openreplay.com/plugins/pinia"
                  target="_blank"
                >
                  Pinia
                </a>
                {', '}
                <a
                  className="underline color-teal"
                  href="https://docs.openreplay.com/plugins/zustand"
                  target="_blank"
                >
                  Zustand
                </a>
                {', '}
                <a
                  className="underline color-teal"
                  href="https://docs.openreplay.com/plugins/mobx"
                  target="_blank"
                >
                  MobX
                </a>
                {' and '}
                <a
                  className="underline color-teal"
                  href="https://docs.openreplay.com/plugins/ngrx"
                  target="_blank"
                >
                  NgRx
                </a>
                .
                <br />
                <br />
                <button className="color-teal" onClick={() => props.hideHint('storage')}>
                  Got It!
                </button>
              </>
            ) : null
          }
          size="small"
          show={list.length === 0}
        >
          <div className="ph-10 scroll-y" style={{ width: '25%' }}>
            {list.length === 0 ? (
              <div className="color-gray-light font-size-16 mt-20 text-center">
                {'Empty state.'}
              </div>
            ) : (
              <JSONTree collapsed={2} src={stateObject}
              />
            )}
          </div>
          <div className="flex" style={{ width: '75%' }}>
            <Autoscroll className="ph-10">
              {decodedList.map((item: Record<string, any>, i: number) =>
                renderItem(item, i, i > 0 ? decodedList[i - 1] : undefined)
              )}
            </Autoscroll>
          </div>
        </NoContent>
      </BottomBlock.Content>
    </BottomBlock>
  );
}

export default connect(
  (state: any) => ({
    hintIsHidden: state.getIn(['components', 'player', 'hiddenHints', 'storage']),
  }),
  {
    hideHint,
  }
)(observer(Storage));


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