/* eslint-disable i18next/no-literal-string */
import { Icon } from '@/ui/icons/Icon';
import { PopoverPanel } from '@/ui/overlays/popover';
import React from 'react';

import ErrorDetailsModal from 'App/components/Dashboard/components/Errors/ErrorDetailsModal';
import { useModal } from 'App/components/Modal';
import { PlayerContext } from 'App/components/Session/playerContext';
import { shortDurationFromMs } from 'App/date';
import { useStore } from 'App/mstore';

import FetchDetails from 'Shared/FetchDetailsModal';
import GraphQLDetailsModal from 'Shared/GraphQLDetailsModal';

import StackEventModal from '../StackEventModal';
import {
  ExceptionElement,
  FrustrationElement,
  NetworkElement,
  PerformanceElement,
  StackEventElement,
  getFrustration,
  shortenResourceName,
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
  jump?: (time: number) => void;
  isSpot: boolean;
}
const TimelinePointer = React.memo((props: Props) => {
  const { pointer, type, isGrouped, isSpot, jump } = props;
  const { player } = isSpot
    ? { player: { jump } }
    : React.useContext(PlayerContext);
  const item = isGrouped ? pointer : pointer?.[0];

  const { showModal } = useModal();
  const { uiPlayerStore } = useStore();
  const createEventClickHandler = (pointer: any, type: any) => (e: any) => {
    if (props.noClick) return;
    e.stopPropagation();
    player.jump!(pointer.time);
    if (!type) {
      return;
    }

    if (type === 'ERRORS') {
      showModal(<ErrorDetailsModal errorId={pointer.errorId} />, {
        right: true,
        size: 'wide',
      });
    }

    if (type === 'EVENT') {
      showModal(<StackEventModal event={pointer} />, {
        right: true,
      });
    }

    if (type === 'NETWORK') {
      if (pointer.tp === 'graph_ql') {
        showModal(<GraphQLDetailsModal resource={pointer} />, {
          right: true,
        });
      } else if (uiPlayerStore.requestSheetHosts > 0) {
        uiPlayerStore.openRequestSheet([pointer], 0);
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

  if (!item || (isGrouped && !item.length)) return null;

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
    <PopoverPanel
      placement="right"
      className="p-3"
      content={
        <div style={{ maxHeight: 160, overflowY: 'auto' }}>
          <p className="mb-2 text-xs font-medium text-content-muted">{title}</p>
          {items.map((pointer) => (
            <div
              key={pointer.time}
              onClick={createEventClickHandler(pointer, type)}
              className="m-hover flex items-center gap-2 rounded-control px-2 py-1 cursor-pointer text-sm"
            >
              <div className="text-content-muted tabular-nums">
                @{shortDurationFromMs(pointer.time)}
              </div>
              <RenderLineData type={type} item={pointer} />
            </div>
          ))}
        </div>
      }
    >
      <button type="button" onClick={onClick} className="m-dt__mark is-group">
        {items.length}
      </button>
    </PopoverPanel>
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
