import {
  InfoCircleOutlined,
  LeftOutlined,
  RightOutlined,
  ShareAltOutlined,
  UserSwitchOutlined,
} from '@ant-design/icons';
import { Button, Popover, Tooltip } from 'antd';
import { ArrowLeft, User } from 'lucide-react';
import React from 'react';

import { countries } from 'App/constants';
import { browserIcon, deviceTypeIcon, osIcon } from 'App/iconNames';
import { capitalize } from 'App/utils';
import Tabs from 'Components/Session/Tabs';
import { PlayerContext } from 'Components/Session/playerContext';
import HighlightButton from 'Components/Session_/Highlight/HighlightButton';
import SessionInfoItem from 'Components/Session_/SessionInfoItem';
import SessionCopyLink from 'Components/shared/SharePopup/SessionCopyLink';
import { CountryFlag } from 'UI';

import MetaItem from 'Shared/SessionItem/MetaItem';

import {
  CAT_ICON,
  CriticalToggle,
  type Issue,
  type IssueSessionCard,
} from '../shared';

const TOP_Z = 2147483647;

type SideTab = 'activity' | 'issue' | null;

const Divider = () => <div className="h-6 border-l border-gray-light mx-1" />;

/* Player header sourced from the session-replay subheader (share / highlight /
   prev-next), but led by this session's variation of the issue. The parent
   issue + environment metadata sit on the line below / behind "More". */
export default function IssuePlayerHeader({
  issue,
  card,
  email,
  browser,
  os,
  device,
  countryCode,
  city,
  date,
  variation,
  tab,
  setTab,
  onBack,
  onSetCritical,
  prevId,
  nextId,
  onGoSession,
  onHighlight,
}: {
  issue?: Issue;
  card?: IssueSessionCard;
  email: string;
  browser: string;
  os: string;
  device: string;
  countryCode: string;
  city: string;
  date: string;
  variation?: string;
  tab: SideTab;
  setTab: (t: SideTab) => void;
  onBack: () => void;
  onSetCritical: (val: boolean, reason?: string) => void;
  prevId: string | null;
  nextId: string | null;
  onGoSession: (sid: string) => void;
  onHighlight: () => void;
}) {
  const ctx = React.useContext(PlayerContext);
  const time = ctx.store?.get?.()?.time ?? 0;

  const CatIc = issue ? CAT_ICON[issue.cat ?? 'Errors'] : null;
  const more = (
    <div className="text-left bg-white">
      {issue?.cat && CatIc && (
        <SessionInfoItem
          comp={
            <CatIc size={16} strokeWidth={2} style={{ color: '#3EAAAF' }} />
          }
          label="Category"
          value={issue.cat}
        />
      )}
      <SessionInfoItem
        comp={
          <User
            size={16}
            strokeWidth={2}
            style={{ color: 'var(--color-gray-medium)' }}
          />
        }
        label="User"
        value={email}
      />
      <SessionInfoItem
        comp={<CountryFlag country={countryCode} />}
        label={countries[countryCode] || countryCode || 'Unknown'}
        value={city}
      />
      {browser && (
        <SessionInfoItem icon={browserIcon(browser)} label={browser} value="" />
      )}
      {os && <SessionInfoItem icon={osIcon(os)} label={os} value="" />}
      <SessionInfoItem
        icon={deviceTypeIcon(device)}
        label={capitalize(device)}
        value=""
        isLast={!card?.plan}
      />
      {/* customer-defined metadata — wrapping pills so many fields stay compact */}
      {card?.plan && (
        <div className="pt-3" style={{ maxWidth: 320 }}>
          <div
            className="px-2 pb-2 text-xs font-semibold uppercase color-gray-medium"
            style={{ letterSpacing: '0.05em' }}
          >
            Metadata
          </div>
          <div className="px-2 flex flex-wrap gap-1">
            <MetaItem label="plan" value={card.plan} />
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex items-center gap-1 px-2 py-2.5 w-full bg-white border-b border-gray-light">
      <Tooltip title={issue ? `Back to “${issue.head}”` : 'Back to issues'}>
        <Button
          type="text"
          size="small"
          icon={<ArrowLeft size={15} />}
          onClick={onBack}
          className="px-2"
        >
          Back to issue
        </Button>
      </Tooltip>
      <Divider />

      <div className="leading-tight min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          {issue && (
            <CriticalToggle
              critical={issue.critical}
              onSet={onSetCritical}
              zIndex={TOP_Z}
            />
          )}
          <Tooltip title={variation}>
            <span
              className="font-medium truncate color-gray-darkest"
              style={{ maxWidth: 480 }}
            >
              {variation ?? 'Session replay'}
            </span>
          </Tooltip>
        </div>
        <div className="flex items-center gap-1 lg:gap-2 text-black/50 text-sm">
          {issue && (
            <>
              <Tooltip title={`Part of issue: ${issue.head}`}>
                <span className="truncate" style={{ maxWidth: 320 }}>
                  {issue.head}
                </span>
              </Tooltip>
              <span>·</span>
            </>
          )}
          {date && (
            <>
              <span className="whitespace-nowrap">{date}</span>
              <span>·</span>
            </>
          )}
          <Popover
            content={more}
            trigger="hover"
            placement="bottom"
            zIndex={TOP_Z}
          >
            <span className="link cursor-pointer">More</span>
          </Popover>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2 shrink-0">
        <Popover
          trigger="click"
          placement="bottomRight"
          zIndex={TOP_Z}
          content={
            <div style={{ width: 248 }}>
              <SessionCopyLink time={time} />
            </div>
          }
        >
          <Tooltip title="Share session" placement="bottom">
            <Button size="small" icon={<ShareAltOutlined />} />
          </Tooltip>
        </Popover>

        <HighlightButton onClick={onHighlight} />

        <Divider />

        <div className="flex items-center gap-1">
          <Tooltip
            title="Previous session"
            placement="bottom"
            open={prevId ? undefined : false}
          >
            <Button
              size="small"
              shape="circle"
              disabled={!prevId}
              onClick={() => prevId && onGoSession(prevId)}
              icon={<LeftOutlined />}
            />
          </Tooltip>
          <Tooltip
            title="Next session"
            placement="bottom"
            open={nextId ? undefined : false}
          >
            <Button
              size="small"
              shape="circle"
              disabled={!nextId}
              onClick={() => nextId && onGoSession(nextId)}
              icon={<RightOutlined />}
            />
          </Tooltip>
        </div>

        <Divider />

        <Tabs
          className="w-fit! border-b-0!"
          tabs={[
            {
              key: 'activity',
              text: 'Activity',
              iconComp: (
                <div className="mr-1">
                  <UserSwitchOutlined />
                </div>
              ),
            },
            {
              key: 'issue',
              text: 'Issue',
              iconComp: (
                <div className="mr-1">
                  <InfoCircleOutlined />
                </div>
              ),
            },
          ]}
          active={tab ?? ''}
          onClick={(k: any) => (k === tab ? setTab(null) : setTab(k))}
        />
      </div>
    </div>
  );
}
