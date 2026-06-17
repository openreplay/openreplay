import React from 'react';
import { Button, Segmented, Popover } from 'antd';
import {
  ArrowLeft,
  ExternalLink,
  Pencil,
  EyeOff,
  Play,
  SkipBack,
  SkipForward,
  Maximize2,
  ArrowUpRight,
  PanelLeft,
  PanelBottom,
  LayoutGrid,
  List,
} from 'lucide-react';
import { PlayCircleOutlined } from '@ant-design/icons';
import { observer } from 'mobx-react-lite';
import { Avatar, CountryFlag, TextEllipsis } from 'UI';
import SessionMetaList from 'Shared/SessionItem/SessionMetaList';
import SessionInfoItem from 'Components/Session_/SessionInfoItem';
import { countries } from 'App/constants';
import { browserIcon, osIcon, deviceTypeIcon } from 'App/iconNames';
import { useStore } from 'App/mstore';
import { useHistory, useParams } from 'App/routing';
import {
  withSiteId,
  issues as issuesRoute,
  issueSession as issueSessionRoute,
} from 'App/routes';
import { capitalize } from 'App/utils';
import { type IssueSessionCard } from 'App/mstore/issuesStore';
import ProblemCard, { AiSummary } from './ProblemCard';
import { MOCK_THUMB } from './mockThumb';

/* Issue detail — the intermediary page, built from real app primitives to keep
   the look and feel: issue header + primary AiSummary (ProblemCard), the real
   Spots GridItem card per example session, and a lighter embedded player whose
   bottom bar mirrors the replay page's top session bar (UserCard), connecting
   the selected session card to the player.

   Three ways to look at the sessions, toggled here: left card menu, bottom card
   menu, and a plain list. Only the 3 most representative sessions are shown. */

type GalleryLayout = 'lean' | 'left' | 'bottom' | 'grid';

/* Jira mark (line style) — inherits the button text color via currentColor.
   Creating a ticket targets Jira, so the action carries the Jira icon. */
function JiraIcon({ size = 15 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5.5,22.9722h0a8.7361,8.7361,0,0,0,8.7361,8.7361h2.0556v2.0556A8.7361,8.7361,0,0,0,25.0278,42.5h0V22.9722Z" />
      <path d="M14.2361,14.2361h0a8.7361,8.7361,0,0,0,8.7361,8.7361h2.0556v2.0556a8.7361,8.7361,0,0,0,8.7361,8.7361h0V14.2361Z" />
      <path d="M22.9722,5.5h0a8.7361,8.7361,0,0,0,8.7361,8.7361h2.0556v2.0556A8.7361,8.7361,0,0,0,42.5,25.0278h0V5.5Z" />
    </svg>
  );
}

function clock(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

function eventsLabel(n: number): string {
  return `${n} ${n === 1 ? 'event' : 'events'}`;
}

function avatarSeed(email: string): number {
  let h = 7;
  for (let i = 0; i < email.length; i++) h = (h * 31 + email.charCodeAt(i)) >>> 0;
  return h % 100000;
}

const Dot = () => (
  <span
    className="mx-1 font-bold text-xl"
    style={{ color: 'var(--color-gray-light)' }}
  >
    &#183;
  </span>
);

/* The player's bottom bar — a faithful mirror of the replay page's top session
   bar (UserCard): avatar, email, "time · country · browser, os, device · More"
   with the same More popover, and the plan metadata chip on the right. */
function SessionInfoBar({
  s,
  onOpen,
}: {
  s: IssueSessionCard;
  onOpen: () => void;
}) {
  const country = countries[s.country] || s.country || 'Unknown';
  const more = (
    <div className="text-left bg-white">
      <SessionInfoItem
        comp={<CountryFlag country={s.country} />}
        label={country}
        value={s.date}
      />
      <SessionInfoItem icon={browserIcon(s.browser)} label={s.browser} value="v149.0.0" />
      <SessionInfoItem icon={osIcon(s.os)} label={s.os} value="10.15.7" />
      <SessionInfoItem
        icon={deviceTypeIcon(s.device)}
        label={s.device}
        value="1440 × 900"
        isLast
      />
    </div>
  );
  return (
    <div
      className="bg-white border-t flex items-center px-3 py-2 gap-3"
      style={{ borderColor: 'var(--color-gray-light)' }}
    >
      <Avatar iconSize="20" width="34px" height="34px" seed={avatarSeed(s.email)} />
      <div className="overflow-hidden leading-tight min-w-0">
        <div className="font-medium color-teal truncate">{s.email}</div>
        <div className="text-sm color-gray-medium flex items-center flex-wrap">
          {s.date && (
            <>
              <span className="whitespace-nowrap">{s.date}</span>
              <Dot />
            </>
          )}
          <span>{country}</span>
          <Dot />
          <span className="capitalize">
            {capitalize(s.browser)}, {s.os}, {capitalize(s.device)}
          </span>
          <Dot />
          <span className="whitespace-nowrap">{eventsLabel(s.events)}</span>
          <Dot />
          <Popover content={more} trigger="hover" placement="top">
            <span className="link cursor-pointer">More</span>
          </Popover>
        </div>
      </div>
      <div className="ml-auto flex items-center gap-2">
        {s.plan && (
          <SessionMetaList
            horizontal
            maxLength={2}
            metaList={[{ label: 'plan', value: s.plan }]}
          />
        )}
        <Button
          type="text"
          size="small"
          icon={<ArrowUpRight size={14} />}
          onClick={onOpen}
        >
          Open full replay
        </Button>
      </div>
    </div>
  );
}

/* Lighter session-replay surface (no border/radius — the player block wraps it).
   Static recorded frame + a control bar mirroring the real player. */
function ReplayStage({
  height,
  durationMs,
  onOpen,
}: {
  height: number;
  durationMs: number;
  onOpen?: () => void;
}) {
  return (
    <div className="flex flex-col">
      <div
        className="relative flex items-center justify-center"
        style={{
          height,
          background: `#ffffff url(${MOCK_THUMB}) center top / cover no-repeat`,
        }}
      >
        <button
          onClick={onOpen}
          aria-label="Open session replay"
          className="flex items-center justify-center rounded-full cursor-pointer"
          style={{
            width: 56,
            height: 56,
            background: 'rgba(255,255,255,0.92)',
            boxShadow: '0 2px 10px rgba(0,0,0,0.18)',
          }}
        >
          <Play size={22} style={{ color: 'var(--color-main)', marginLeft: 3 }} />
        </button>
      </div>

      <div
        className="bg-white border-t px-3 pt-2 pb-2 flex flex-col gap-2"
        style={{ borderColor: 'var(--color-gray-light)' }}
      >
        <div
          className="relative rounded-full"
          style={{ height: 6, background: 'var(--color-gray-light)' }}
        >
          <div
            className="absolute left-0 top-0 bottom-0 rounded-full"
            style={{ width: '33%', background: 'var(--color-teal)' }}
          />
          <div
            className="absolute rounded-full"
            style={{
              left: '33%',
              top: '50%',
              transform: 'translate(-50%,-50%)',
              width: 12,
              height: 12,
              background: 'white',
              border: '2px solid var(--color-teal)',
            }}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            className="flex items-center justify-center rounded-full"
            style={{ width: 28, height: 28, background: 'var(--color-main)' }}
          >
            <Play size={14} style={{ color: 'white', marginLeft: 1 }} />
          </button>
          <span
            className="text-xs tabular-nums"
            style={{ color: 'var(--color-gray-dark)' }}
          >
            0:00 / {clock(durationMs)}
          </span>

          <div
            className="flex items-center rounded border ml-1"
            style={{ borderColor: 'var(--color-gray-light)', height: 24 }}
          >
            <span className="px-1.5 flex items-center h-full">
              <SkipBack size={14} style={{ color: 'var(--color-gray-dark)' }} />
            </span>
            <span
              className="px-1.5 flex items-center h-full text-xs font-semibold border-l border-r"
              style={{ borderColor: 'var(--color-gray-light)', color: 'var(--color-gray-dark)' }}
            >
              10s
            </span>
            <span className="px-1.5 flex items-center h-full">
              <SkipForward size={14} style={{ color: 'var(--color-gray-dark)' }} />
            </span>
          </div>

          <Button size="small" className="font-semibold">
            1x
          </Button>
          <Button size="small">Skip Inactivity</Button>

          <span
            className="ml-auto flex items-center cursor-pointer"
            style={{ color: 'var(--color-gray-medium)' }}
          >
            <Maximize2 size={15} />
          </span>
        </div>
      </div>
    </div>
  );
}

function TagChip({ label }: { label: string }) {
  return (
    <span
      className="text-xs px-2 rounded border whitespace-nowrap"
      style={{
        borderColor: 'var(--color-gray-light)',
        background: 'white',
        color: 'var(--color-gray-medium)',
        lineHeight: '20px',
      }}
    >
      {label}
    </span>
  );
}

/* Session card — the Spots card (same thumbnail block: hover play overlay, teal
   tint, duration badge) with a lean footer (email + browser · location). No
   checkbox/menu — those are Spots' multi-select extras we don't need here. */
function SpotCard({
  s,
  active,
  onClick,
}: {
  s: IssueSessionCard;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className={`bg-white rounded-lg overflow-hidden shadow-xs border transition hover:border-teal ${
        active ? 'border-teal' : ''
      }`}
    >
      <div
        className="relative group overflow-hidden"
        style={{
          width: '100%',
          height: 150,
          background: 'var(--color-gray-lightest)',
        }}
      >
        <div
          className="block w-full h-full cursor-pointer transition hover:bg-teal/70 relative"
          onClick={onClick}
        >
          <img
            src={MOCK_THUMB}
            alt=""
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 scale-75 transition-all hover:scale-100 hover:transition-all group-hover:opacity-100 transition-opacity">
            <PlayCircleOutlined
              style={{ fontSize: 44, color: 'white' }}
              className="bg-teal/50 rounded-full"
            />
          </div>
        </div>
        <div className="absolute bottom-2 right-2 bg-gray-dark text-white p-1 px-2 text-xs rounded-lg">
          {s.dur}
        </div>
      </div>
      <div className="border-t px-3 py-2">
        <TextEllipsis
          text={s.email}
          className="text-sm font-medium"
          popupProps={{ size: 'small', disabled: true }}
        />
        <div
          className="text-xs truncate"
          style={{ color: 'var(--color-gray-medium)' }}
        >
          {capitalize(s.browser)} · {s.loc} · {eventsLabel(s.events)}
        </div>
      </div>
    </div>
  );
}

/* Lean session row — the de-cluttered picker. No screenshot (that lives once, in
   the player). Leads with who + what happened, so it scales to recordings from
   any kind of page. */
function SessionRow({
  s,
  active,
  onClick,
}: {
  s: IssueSessionCard;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left w-full rounded-lg border px-3 py-2.5 flex items-start gap-2.5 transition hover:border-teal"
      style={{
        borderColor: active ? 'var(--color-teal)' : 'var(--color-gray-light)',
        background: active ? 'var(--color-active-blue)' : 'white',
      }}
    >
      <Avatar iconSize="18" width="30px" height="30px" seed={avatarSeed(s.email)} />
      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className="text-sm font-medium truncate"
            style={{ color: 'var(--color-gray-darkest)' }}
          >
            {s.email}
          </span>
          <span
            className="ml-auto text-xs tabular-nums shrink-0"
            style={{ color: 'var(--color-gray-medium)' }}
          >
            {s.dur}
          </span>
        </div>
        <span
          className="text-xs truncate"
          style={{ color: 'var(--color-gray-medium)' }}
        >
          {capitalize(s.browser)} · {s.loc} · {eventsLabel(s.events)}
        </span>
        {s.journey && (
          <span
            className="text-xs truncate mt-0.5"
            style={{ color: 'var(--color-gray-medium)' }}
          >
            {s.journey}
          </span>
        )}
      </div>
    </button>
  );
}

function IssueDetail() {
  const { issuesStore, projectsStore } = useStore();
  const siteId = projectsStore.activeSiteId;
  const history = useHistory();
  const params = useParams() as { issueId?: string };
  const issue = issuesStore.byId(Number(params.issueId));

  const [layout, setLayout] = React.useState<GalleryLayout>('lean');
  const [selected, setSelected] = React.useState(0);
  const [ticketHover, setTicketHover] = React.useState(false);

  const back = () => history.push(withSiteId(issuesRoute(), siteId));
  const openReplay = (s: IssueSessionCard) =>
    history.push(withSiteId(issueSessionRoute(s.sessionId), siteId));

  if (!issue) {
    return (
      <div className="mx-auto flex flex-col gap-4" style={{ maxWidth: 1100 }}>
        <Button type="text" icon={<ArrowLeft size={15} />} onClick={back}>
          Back to Issues
        </Button>
        <div
          className="p-8 text-center rounded-lg border"
          style={{ color: 'var(--color-gray-medium)' }}
        >
          Issue not found.
        </div>
      </div>
    );
  }

  // only the 3 most representative sessions — a curated pick, not a search
  const sessions = issuesStore.exampleSessions(issue).slice(0, 3);
  const current = sessions[Math.min(selected, sessions.length - 1)];

  // lean text rows (default) — the de-cluttered picker
  const leanSelector = (
    <div className="flex flex-col gap-2 flex-shrink-0" style={{ width: 300 }}>
      {sessions.map((s, i) => (
        <SessionRow
          key={s.sessionId}
          s={s}
          active={i === selected}
          onClick={() => setSelected(i)}
        />
      ))}
    </div>
  );

  // big-thumbnail cards (kept for comparison)
  const selector = (
    <div
      className={
        layout === 'left'
          ? 'flex flex-col gap-3 flex-shrink-0'
          : 'flex flex-row gap-3 overflow-x-auto pb-1'
      }
      style={layout === 'left' ? { width: 280 } : undefined}
    >
      {sessions.map((s, i) => (
        <div
          key={s.sessionId}
          style={layout === 'bottom' ? { width: 280, flexShrink: 0 } : undefined}
        >
          <SpotCard
            s={s}
            active={i === selected}
            onClick={() => setSelected(i)}
          />
        </div>
      ))}
    </div>
  );

  const stage = (
    <div className="flex flex-col gap-3 flex-1 min-w-0">
      <div
        className="rounded-lg border overflow-hidden flex flex-col"
        style={{ borderColor: 'var(--color-gray-light)' }}
      >
        <ReplayStage
          height={layout === 'left' || layout === 'lean' ? 320 : 360}
          durationMs={current?.durMs ?? 0}
          onOpen={() => current && openReplay(current)}
        />
        {current && (
          <SessionInfoBar s={current} onOpen={() => openReplay(current)} />
        )}
        {current && (current.journey || current.tags.length > 0) && (
          <div
            className="border-t bg-white px-3 py-3 flex flex-col gap-2"
            style={{ borderColor: 'var(--color-gray-light)' }}
          >
            {current.journey && (
              <AiSummary variant="secondary">{current.journey}</AiSummary>
            )}
            {current.tags.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {current.tags.map((t) => (
                  <TagChip key={t} label={t} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // a 3-card grid, like Spots — tiny data per card, click to open the replay
  const gridView = (
    <div className="grid grid-cols-3 gap-4">
      {sessions.map((s) => (
        <SpotCard key={s.sessionId} s={s} onClick={() => openReplay(s)} />
      ))}
    </div>
  );

  const galleryHeader = (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span
          className="text-sm font-medium"
          style={{ color: 'var(--color-gray-dark)' }}
        >
          Example sessions
        </span>
        <Segmented
          size="small"
          value={layout}
          onChange={(v) => setLayout(v as GalleryLayout)}
          options={[
            { value: 'lean', icon: <List size={14} /> },
            { value: 'left', icon: <PanelLeft size={14} /> },
            { value: 'bottom', icon: <PanelBottom size={14} /> },
            { value: 'grid', icon: <LayoutGrid size={14} /> },
          ]}
        />
      </div>
      <span className="text-xs" style={{ color: 'var(--color-gray-medium)' }}>
        The most representative sessions for this issue, picked automatically.
      </span>
    </div>
  );

  return (
    <div className="mx-auto flex flex-col gap-4" style={{ maxWidth: 1100 }}>
      <div className="flex items-center justify-between">
        <Button type="text" icon={<ArrowLeft size={15} />} onClick={back}>
          Back to Issues
        </Button>
        <div className="flex items-center gap-2">
          <Button
            type="primary"
            icon={
              ticketHover ? <ExternalLink size={15} /> : <JiraIcon size={15} />
            }
            onMouseEnter={() => setTicketHover(true)}
            onMouseLeave={() => setTicketHover(false)}
          >
            Create ticket
          </Button>
          <Button icon={<Pencil size={14} />}>Rename</Button>
          <Button icon={<EyeOff size={14} />}>Hide</Button>
        </div>
      </div>

      <ProblemCard issue={issue} />

      <div className="flex flex-col gap-3">
        {galleryHeader}
        {sessions.length === 0 ? (
          <div
            className="p-6 text-center rounded-lg border text-sm"
            style={{ color: 'var(--color-gray-medium)' }}
          >
            No example sessions.
          </div>
        ) : layout === 'grid' ? (
          gridView
        ) : layout === 'lean' ? (
          <div className="flex gap-4">
            {leanSelector}
            {stage}
          </div>
        ) : layout === 'left' ? (
          <div className="flex gap-4">
            {selector}
            {stage}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {stage}
            {selector}
          </div>
        )}
      </div>
    </div>
  );
}

export default observer(IssueDetail);
