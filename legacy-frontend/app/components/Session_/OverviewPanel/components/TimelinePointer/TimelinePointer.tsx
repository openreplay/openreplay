import React from 'react';
import { NETWORK, EXCEPTIONS } from 'Duck/components/player';
import { useModal } from 'App/components/Modal';
import { Icon } from 'UI';
import StackEventModal from '../StackEventModal';
import ErrorDetailsModal from 'App/components/Dashboard/components/Errors/ErrorDetailsModal';
import FetchDetails from 'Shared/FetchDetailsModal';
import GraphQLDetailsModal from 'Shared/GraphQLDetailsModal';
import { PlayerContext } from 'App/components/Session/playerContext';
import { TYPES } from 'App/types/session/event'
import { types as issueTypes } from 'App/types/session/issue'
import { Tooltip } from 'antd';

interface Props {
  pointer: any;
  type: 'ERRORS' | 'EVENT' | 'NETWORK' | 'FRUSTRATIONS' | 'EVENTS' | 'PERFORMANCE';
  noClick?: boolean;
  fetchPresented?: boolean;
}
const TimelinePointer = React.memo((props: Props) => {
  const { player } = React.useContext(PlayerContext)

  const { showModal } = useModal();
  const createEventClickHandler = (pointer: any, type: any) => (e: any) => {
    if (props.noClick) return;
    e.stopPropagation();
    player.jump(pointer.time);
    if (!type) {
      return;
    }

    if (type === 'ERRORS') {
      showModal(<ErrorDetailsModal errorId={pointer.errorId} />, { right: true, width: 1200 });
    }

    if (type === 'EVENT') {
      showModal(<StackEventModal event={pointer} />, { right: true, width: 450 });
    }

    if (type === NETWORK) {
      if (pointer.tp === 'graph_ql') {
        showModal(<GraphQLDetailsModal resource={pointer} />, { right: true, width: 500 });
      } else {
        showModal(<FetchDetails resource={pointer} fetchPresented={props.fetchPresented} />, { right: true, width: 500 });
      }
    }
    // props.toggleBottomBlock(type);
  };

  const renderNetworkElement = (item: any) => {
    const name = item.name || '';
    return (
      <Tooltip
        title={
          <div className="">
            <b>{item.success ? 'Slow resource: ' : '4xx/5xx Error:'}</b>
            <br />
            {name.length > 200
              ? name.slice(0, 100) + ' ... ' + name.slice(-50)
              : name.length > 200
              ? item.name.slice(0, 100) + ' ... ' + item.name.slice(-50)
              : item.name}
          </div>
        }
      >
        <div onClick={createEventClickHandler(item, NETWORK)} className="cursor-pointer">
          <div className="h-4 w-4 rounded-full bg-red text-white font-bold flex items-center justify-center text-sm">
            <span>!</span>
          </div>
        </div>
      </Tooltip>
    );
  };

  const renderFrustrationElement = (item: any) => {
    const elData = { name: '', icon: ''}
    if (item.type === TYPES.CLICK) Object.assign(elData, { name: `User hesitated to click for ${Math.round(item.hesitation/1000)}s`, icon: 'click-hesitation' })
    if (item.type === TYPES.INPUT) Object.assign(elData, { name: `User hesitated to enter a value for ${Math.round(item.hesitation/1000)}s`, icon: 'input-hesitation' })
    if (item.type === TYPES.CLICKRAGE || item.type === TYPES.TAPRAGE) Object.assign(elData, { name: 'Click Rage', icon: 'click-rage' })
    if (item.type === TYPES.DEAD_LICK) Object.assign(elData, { name: 'Dead Click', icon: 'emoji-dizzy' })
    if (item.type === issueTypes.MOUSE_THRASHING) Object.assign(elData, { name: 'Mouse Thrashing', icon: 'cursor-trash' })
    if (item.type === 'ios_perf_event') Object.assign(elData, { name: item.name, icon: item.icon })

    return (
      <Tooltip
        title={
          <div className="">
            <b>{elData.name}</b>
          </div>
        }
      >
        <div onClick={createEventClickHandler(item, null)} className="cursor-pointer">
          <Icon name={elData.icon} color="black" size="16" />
        </div>
      </Tooltip>
    );
  };

  const renderStackEventElement = (item: any) => {
    return (
      <Tooltip
        title={
          <div className="">
            <b>{item.name || 'Stack Event'}</b>
          </div>
        }
      >
        <div
          onClick={createEventClickHandler(item, 'EVENT')}
          className="cursor-pointer w-1 h-4 bg-red"
        >
          {/* <Icon className="rounded-full bg-white" name="funnel/exclamation-circle-fill" color="red" size="16" /> */}
        </div>
      </Tooltip>
    );
  };

  const renderPerformanceElement = (item: any) => {
    return (
      <Tooltip
        title={
          <div className="">
            <b>{item.type}</b>
          </div>
        }
      >
        <div
          onClick={createEventClickHandler(item, EXCEPTIONS)}
          className="cursor-pointer w-1 h-4 bg-red"
        >
          {/* <Icon className="rounded-full bg-white" name="funnel/exclamation-circle-fill" color="red" size="16" /> */}
        </div>
      </Tooltip>
    );
  };

  const renderExceptionElement = (item: any) => {
    return (
      <Tooltip
        title={
          <div className="">
            <b>{'Exception'}</b>
            <br />
            <span>{item.message}</span>
          </div>
        }
      >
        <div onClick={createEventClickHandler(item, 'ERRORS')} className="cursor-pointer">
          <div className="h-4 w-4 rounded-full bg-red text-white font-bold flex items-center justify-center text-sm">
            <span>!</span>
          </div>
        </div>
      </Tooltip>
    );
  };

  const render = () => {
    const { pointer, type } = props;
    if (type === 'NETWORK') {
      return renderNetworkElement(pointer);
    }
    if (type === 'FRUSTRATIONS') {
      return renderFrustrationElement(pointer);
    }
    if (type === 'ERRORS') {
      return renderExceptionElement(pointer);
    }
    if (type === 'EVENTS') {
      return renderStackEventElement(pointer);
    }

    if (type === 'PERFORMANCE') {
      return renderPerformanceElement(pointer);
    }
  };
  return <div>{render()}</div>;
});

export default TimelinePointer;
