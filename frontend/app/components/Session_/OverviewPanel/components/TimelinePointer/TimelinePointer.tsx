/* eslint-disable i18next/no-literal-string */
import React from 'react';
import { useModal } from 'App/components/Modal';
import { Icon } from 'UI';
import { shortDurationFromMs } from 'App/date';
import ErrorDetailsModal from 'App/components/Dashboard/components/Errors/ErrorDetailsModal';
import FetchDetails from 'Shared/FetchDetailsModal';
import GraphQLDetailsModal from 'Shared/GraphQLDetailsModal';
import { PlayerContext } from 'App/components/Session/playerContext';
import { Popover } from 'antd';
import StackEventModal from '../StackEventModal';
import {
  shortenResourceName,
  NetworkElement,
  getFrustration,
  FrustrationElement,
  StackEventElement,
  PerformanceElement,
  ExceptionElement,
} from './Dots';

interface Props {
  pointer: any;
  type:
    | 'ERRORS'
    | 'EVENT'
    | 'NETWORK'
    | 'FRUSTRATIONS'
    | 'EVENTS'
    | 'PERFORMANCE';
  noClick?: boolean;
  fetchPresented?: boolean;
  isGrouped?: boolean;
}
const TimelinePointer = React.memo((props: Props) => {
  const { pointer, type, isGrouped } = props;
  const { player } = React.useContext(PlayerContext);
  const item = isGrouped ? pointer : pointer[0];

  const { showModal } = useModal();
  const createEventClickHandler = (pointer: any, type: any) => (e: any) => {
    if (props.noClick) return;
    e.stopPropagation();
    player.jump(pointer.time);
    if (!type) {
      return;
    }

    if (type === 'ERRORS') {
      showModal(<ErrorDetailsModal errorId={pointer.errorId} />, {
        right: true,
        width: 1200,
      });
    }

    if (type === 'EVENT') {
      showModal(<StackEventModal event={pointer} />, {
        right: true,
        width: 450,
      });
    }

    if (type === 'NETWORK') {
      if (pointer.tp === 'graph_ql') {
        showModal(<GraphQLDetailsModal resource={pointer} />, {
          right: true,
          width: 500,
        });
      } else {
        showModal(
          <FetchDetails
            resource={pointer}
            fetchPresented={props.fetchPresented}
          />,
          { right: true, width: 500 },
        );
      }
    }
  };

  if (isGrouped) {
    const onClick = createEventClickHandler(item[0], type);
    return (
      <GroupedIssue
        type={type}
        items={item}
        onClick={onClick}
        createEventClickHandler={createEventClickHandler}
      />
    );
  }

  if (type === 'NETWORK') {
    return (
      <NetworkElement
        item={item}
        createEventClickHandler={createEventClickHandler}
      />
    );
  }
  if (type === 'FRUSTRATIONS') {
    return (
      <FrustrationElement
        item={item}
        createEventClickHandler={createEventClickHandler}
      />
    );
  }
  if (type === 'ERRORS') {
    return (
      <ExceptionElement
        item={item}
        createEventClickHandler={createEventClickHandler}
      />
    );
  }
  if (type === 'EVENTS') {
    return (
      <StackEventElement
        item={item}
        createEventClickHandler={createEventClickHandler}
      />
    );
  }

  if (type === 'PERFORMANCE') {
    return (
      <PerformanceElement
        item={item}
        createEventClickHandler={createEventClickHandler}
      />
    );
  }

  return <div>unknown type</div>;
});

function GroupedIssue({
  type,
  items,
  onClick,
  createEventClickHandler,
}: {
  type: string;
  items: Record<string, any>[];
  onClick: () => void;
  createEventClickHandler: any;
}) {
  const subStr = {
    NETWORK: 'Network Issues',
    ERRORS: 'Errors',
    EVENTS: 'Events',
    FRUSTRATIONS: 'Frustrations',
  };
  const title = `${items.length} ${subStr[type]} Observed`;

  return (
    <Popover
      placement="right"
      title={title}
      content={
        <div style={{ maxHeight: 160, overflowY: 'auto' }}>
          {items.map((pointer) => (
            <div
              key={pointer.time}
              onClick={createEventClickHandler(pointer, type)}
              className="flex items-center gap-2 mb-1 cursor-pointer border-b border-transparent hover:border-gray-lightest"
            >
              <div className="text-secondary">
                @{shortDurationFromMs(pointer.time)}
              </div>
              <RenderLineData type={type} item={pointer} />
            </div>
          ))}
        </div>
      }
    >
      <div
        onClick={onClick}
        className="h-5 w-5 cursor-pointer rounded-full bg-red text-white font-bold flex items-center justify-center text-xs"
      >
        {items.length}
      </div>
    </Popover>
  );
}

function RenderLineData({ item, type }: any) {
  if (type === 'FRUSTRATIONS') {
    const elData = getFrustration(item);
    return (
      <>
        <div>
          <Icon name={elData.icon} color="black" size="16" />
        </div>
        <div>{elData.name}</div>
      </>
    );
  }
  if (type === 'NETWORK') {
    const name = item.success ? 'Slow resource' : '4xx/5xx Error';
    return (
      <>
        <div>{name}</div>
        <div>{shortenResourceName(item.name)}</div>
      </>
    );
  }
  if (type === 'EVENTS') {
    return <div>{item.name || 'Stack Event'}</div>;
  }
  if (type === 'PERFORMANCE') {
    return <div>{item.type}</div>;
  }
  if (type === 'ERRORS') {
    return <div>{item.message}</div>;
  }
  return <div>{JSON.stringify(item)}</div>;
}

export default TimelinePointer;
