import React from 'react';
import { Icon } from 'UI';
import { Popover } from 'antd';
import cn from 'classnames';
import { FilterKey } from 'Types/filter/filterType';
import {
  AppWindow,
  ArrowUpDown,
  Chrome,
  CircleAlert,
  Clock2,
  Code,
  ContactRound,
  Cpu,
  Earth,
  FileStack,
  MapPin,
  MemoryStick,
  MonitorSmartphone,
  Navigation,
  Network,
  OctagonAlert,
  Pin,
  Pointer,
  RectangleEllipsis,
  SquareMousePointer,
  SquareUser,
  Timer,
  VenetianMask,
  Workflow,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  payload: any;
}
const IconMap = {
  [FilterKey.CLICK]: <Pointer size={14} />,
  [FilterKey.LOCATION]: <Navigation size={14} />,
  [FilterKey.INPUT]: <RectangleEllipsis size={14} />,
  [FilterKey.CUSTOM]: <Code size={14} />,
  [FilterKey.FETCH]: <ArrowUpDown size={14} />,
  [FilterKey.GRAPHQL]: <Network size={14} />,
  [FilterKey.STATEACTION]: <RectangleEllipsis size={14} />,
  [FilterKey.ERROR]: <OctagonAlert size={14} />,
  [FilterKey.ISSUE]: <CircleAlert size={14} />,
  [FilterKey.FETCH_FAILED]: <Code size={14} />,
  [FilterKey.DOM_COMPLETE]: <ArrowUpDown size={14} />,
  [FilterKey.LARGEST_CONTENTFUL_PAINT_TIME]: <Network size={14} />,
  [FilterKey.TTFB]: <Timer size={14} />,
  [FilterKey.AVG_CPU_LOAD]: <Cpu size={14} />,
  [FilterKey.AVG_MEMORY_USAGE]: <MemoryStick size={14} />,
  [FilterKey.USERID]: <SquareUser size={14} />,
  [FilterKey.USERANONYMOUSID]: <VenetianMask size={14} />,
  [FilterKey.USER_CITY]: <Pin size={14} />,
  [FilterKey.USER_STATE]: <MapPin size={14} />,
  [FilterKey.USER_COUNTRY]: <Earth size={14} />,
  [FilterKey.USER_DEVICE]: <Code size={14} />,
  [FilterKey.USER_OS]: <AppWindow size={14} />,
  [FilterKey.USER_BROWSER]: <Chrome size={14} />,
  [FilterKey.PLATFORM]: <MonitorSmartphone size={14} />,
  [FilterKey.REVID]: <FileStack size={14} />,
  [FilterKey.REFERRER]: <Workflow size={14} />,
  [FilterKey.DURATION]: <Clock2 size={14} />,
  [FilterKey.TAGGED_ELEMENT]: <SquareMousePointer size={14} />,
  [FilterKey.METADATA]: <ContactRound size={14} />,
};

function NodeButton(props: Props) {
  const { payload } = props;
  const { t } = useTranslation();

  const payloadStr = payload.name ?? payload.eventType;

  // we need to only trim the middle, so its readable
  const safePName =
    payloadStr.length > 70
      ? `${payloadStr.slice(0, 25)}...${payloadStr.slice(-25)}`
      : payloadStr;

  // @ts-ignore
  const eventIcon = IconMap[payload.eventType.toLowerCase()] ?? (
    <Icon name="link-45deg" size={18} />
  );
  return (
    <div className="relative">
      <Popover
        content={
          <div className="bg-white rounded-sm mt-1 text-xs">
            <div className="border-b py-1 px-2 flex items-center gap-1">
              {eventIcon}
              <div
                className={cn(
                  'text-ellipsis overflow-hidden',
                  'max-w-80 whitespace-nowrap',
                )}
              >
                {safePName}
              </div>
            </div>
            <div className="border-b py-1 px-2 flex items-center gap-1">
              <Icon name="arrow-right-short" size={18} color="green" />
              <div className="ml-1 font-medium">
                {t('Continuing')}&nbsp;{Math.round(payload.value)}%
              </div>
            </div>
            {payload.avgTimeFromPrevious && (
              <div className="border-b py-1 px-2 flex items-center gap-1">
                <Icon name="clock-history" size={16} />

                <div className="ml-1 font-medium">
                  {t('Average time from previous step')}{' '}
                  <span>{payload.avgTimeFromPrevious}</span>
                </div>
              </div>
            )}
          </div>
        }
      >
        <div
          className="flex items-center gap-1 copy-popover select-none rounded-sm shadow-sm"
          style={{
            backgroundColor: 'white',
            padding: '3px 6px',
            maxWidth: '180px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            fontSize: '12px',
            width: 'fit-content',
          }}
        >
          {eventIcon}
          <div
            style={{
              maxWidth: '120px',
              width: 'fit-content',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {payload.name}
          </div>
          <span style={{ fontWeight: 'bold' }}>
            {`${Math.round(payload.value)}%`}
          </span>
        </div>
      </Popover>
    </div>
  );
}

export default NodeButton;
