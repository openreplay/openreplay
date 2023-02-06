import React from 'react';
import { Controls } from 'Player';
import { NETWORK, EXCEPTIONS } from 'Duck/components/player';
import { useModal } from 'App/components/Modal';
import { Icon, Tooltip } from 'UI';
import StackEventModal from '../StackEventModal';
import ErrorDetailsModal from 'App/components/Dashboard/components/Errors/ErrorDetailsModal';
import FetchDetails from 'Shared/FetchDetailsModal';
import GraphQLDetailsModal from 'Shared/GraphQLDetailsModal';

interface Props {
  pointer: any;
  type: any;
  noClick?: boolean;
  fetchPresented?: boolean;
}
const TimelinePointer = React.memo((props: Props) => {
  const { showModal } = useModal();
  const createEventClickHandler = (pointer: any, type: any) => (e: any) => {
    if (props.noClick) return;
    e.stopPropagation();
    Controls.jump(pointer.time);
    if (!type) {
      return;
    }

    if (type === 'ERRORS') {
      showModal(<ErrorDetailsModal errorId={pointer.errorId} />, { right: true });
    }

    if (type === 'EVENT') {
      showModal(<StackEventModal event={pointer} />, { right: true });
    }

    if (type === NETWORK) {
      if (pointer.tp === 'graph_ql') {
        showModal(<GraphQLDetailsModal resource={pointer} />, { right: true });
      } else {
        showModal(<FetchDetails resource={pointer} fetchPresented={props.fetchPresented} />, { right: true });
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
        delay={0}
        placement="top"
      >
        <div onClick={createEventClickHandler(item, NETWORK)} className="cursor-pointer">
          <div className="h-4 w-4 rounded-full bg-red text-white font-bold flex items-center justify-center text-sm">
            <span>!</span>
          </div>
        </div>
      </Tooltip>
    );
  };

  const renderClickRageElement = (item: any) => {
    return (
      <Tooltip
        title={
          <div className="">
            <b>{'Click Rage'}</b>
          </div>
        }
        delay={0}
        placement="top"
      >
        <div onClick={createEventClickHandler(item, null)} className="cursor-pointer">
          <Icon className="bg-white" name="funnel/emoji-angry" color="red" size="16" />
        </div>
      </Tooltip>
    );
  };

  const renderStackEventElement = (item: any) => {
    return (
      <Tooltip
        title={
          <div className="">
            <b>{'Stack Event'}</b>
          </div>
        }
        delay={0}
        placement="top"
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
        delay={0}
        placement="top"
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
        delay={0}
        placement="top"
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
    if (type === 'CLICKRAGE') {
      return renderClickRageElement(pointer);
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
