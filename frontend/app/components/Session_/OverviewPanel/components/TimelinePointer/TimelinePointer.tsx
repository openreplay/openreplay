import React from 'react';
import { connectPlayer, Controls } from 'App/player';
import { toggleBottomBlock, NETWORK, EXCEPTIONS, PERFORMANCE } from 'Duck/components/player';
import { useModal } from 'App/components/Modal';
import { Icon, ErrorDetails, Popup } from 'UI';
import { Tooltip } from 'react-tippy';
import { TYPES as EVENT_TYPES } from 'Types/session/event';
import StackEventModal from '../StackEventModal';
import ErrorDetailsModal from 'App/components/Dashboard/components/Errors/ErrorDetailsModal';
import FetchDetails from 'Shared/FetchDetailsModal';
import GraphQLDetailsModal from 'Shared/GraphQLDetailsModal';

interface Props {
  pointer: any;
  type: any;
}
const TimelinePointer = React.memo((props: Props) => {
  const { showModal, hideModal } = useModal();
  const createEventClickHandler = (pointer: any, type: any) => (e: any) => {
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
        showModal(<FetchDetails resource={pointer} />, { right: true });
      }
    }
    // props.toggleBottomBlock(type);
  };

  const renderNetworkElement = (item: any) => {
    const name = item.name || '';
    return (
      <Popup
        content={
          <div className="">
            <b>{item.success ? 'Slow resource: ' : 'Missing resource:'}</b>
            <br />
            {name.length > 200 ? name.slice(0, 100) + ' ... ' + name.slice(-50) : name.length > 200 ? (item.name.slice(0, 100) + ' ... ' + item.name.slice(-50)) : item.name}
          </div>
        }
        delay={0}
        position="top"
      >
        <div onClick={createEventClickHandler(item, NETWORK)} className="cursor-pointer">
          <div className="h-3 w-3 rounded-full bg-red" />
        </div>
      </Popup>
    );
  };

  const renderClickRageElement = (item: any) => {
    return (
      <Popup
        content={
          <div className="">
            <b>{'Click Rage'}</b>
          </div>
        }
        delay={0}
        position="top"
      >
        <div onClick={createEventClickHandler(item, null)} className="cursor-pointer">
          <Icon className="bg-white" name="funnel/emoji-angry" color="red" size="16" />
        </div>
      </Popup>
    );
  };

  const renderStackEventElement = (item: any) => {
    return (
      <Popup
        content={
          <div className="">
            <b>{'Stack Event'}</b>
          </div>
        }
        delay={0}
        position="top"
      >
        <div
          onClick={createEventClickHandler(item, 'EVENT')}
          className="cursor-pointer w-1 h-4 bg-red"
        >
          {/* <Icon className="rounded-full bg-white" name="funnel/exclamation-circle-fill" color="red" size="16" /> */}
        </div>
      </Popup>
    );
  };

  const renderPerformanceElement = (item: any) => {
    return (
      <Popup
        content={
          <div className="">
            <b>{item.type}</b>
          </div>
        }
        delay={0}
        position="top"
      >
        <div
          onClick={createEventClickHandler(item, EXCEPTIONS)}
          className="cursor-pointer w-1 h-4 bg-red"
        >
          {/* <Icon className="rounded-full bg-white" name="funnel/exclamation-circle-fill" color="red" size="16" /> */}
        </div>
      </Popup>
    );
  };

  const renderExceptionElement = (item: any) => {
    return (
      <Popup
        content={
          <div className="">
            <b>{'Exception'}</b>
            <br />
            <span>{item.message}</span>
          </div>
        }
        delay={0}
        position="top"
      >
        <div onClick={createEventClickHandler(item, 'ERRORS')} className="cursor-pointer">
          <Icon
            className="rounded-full bg-white"
            name="funnel/exclamation-circle-fill"
            color="red"
            size="16"
          />
        </div>
      </Popup>
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
