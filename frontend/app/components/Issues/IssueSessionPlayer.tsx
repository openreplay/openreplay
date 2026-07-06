import cn from 'classnames';
import { createPortal } from 'react-dom';
import { observer } from 'mobx-react-lite';
import React from 'react';
import {
  ArrowLeft,
  AlertTriangle,
  Bookmark,
  BookmarkCheck,
  File,
  User,
  Search,
  Play,
} from 'lucide-react';
import {
  MoreOutlined,
  CloseOutlined,
  UserSwitchOutlined,
  InfoCircleOutlined,
  ShareAltOutlined,
  LeftOutlined,
  RightOutlined,
  CaretRightOutlined,
  PauseOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import Tabs from 'Components/Session/Tabs';
import EventGroupWrapper from 'Components/Session_/EventsBlock/EventGroupWrapper';
import eventsStyles from 'Components/Session_/EventsBlock/eventsBlock.module.css';
import { TYPES } from 'Types/session/event';
import {
  Button,
  ConfigProvider,
  Dropdown,
  Input,
  Popover,
  Segmented,
  Switch,
  Tooltip,
  message,
} from 'antd';
import HighlightButton from 'Components/Session_/Highlight/HighlightButton';
import SessionCopyLink from 'Components/shared/SharePopup/SessionCopyLink';
import 'Components/shared/AutoplayToggle/AutoplayToggle.css';

import { useStore } from 'App/mstore';
import { useHistory, useParams } from 'App/routing';
import {
  withSiteId,
  issues as issuesRoute,
  issue as issueDetailRoute,
  issueSession as issueSessionRoute,
} from 'App/routes';
import { CountryFlag, EscapeButton, Icon } from 'UI';
import { countries } from 'App/constants';
import { browserIcon, osIcon, deviceTypeIcon } from 'App/iconNames';
import SessionInfoItem from 'Components/Session_/SessionInfoItem';
import MetaItem from 'Shared/SessionItem/MetaItem';
import {
  CAT_ICON,
  CRITICAL_REASONS,
  impactLevel,
  type Issue,
  type IssueSessionCard,
} from 'App/mstore/issuesStore';

import {
  debounceUpdate,
  getDefaultPanelHeight,
} from 'Components/Session/Player/ReplayPlayer/PlayerInst';
import { SpotOverviewPanelCont } from 'Components/Session_/OverviewPanel/OverviewPanel';
import SpotConsole from 'Components/Spots/SpotPlayer/components/Panels/SpotConsole';
import SpotNetwork from 'Components/Spots/SpotPlayer/components/Panels/SpotNetwork';
import SpotLocation from 'Components/Spots/SpotPlayer/components/SpotLocation';
import SpotTimeline from 'Components/Spots/SpotPlayer/components/SpotTimeline';
import SpotVideoContainer from 'Components/Spots/SpotPlayer/components/SpotVideoContainer';
import spotPlayerStore from 'Components/Spots/SpotPlayer/spotPlayerStore';
import { SPEED_OPTIONS } from 'Player/player/Player';
import {
  IntervalSelector,
  JumpBack,
  JumpForward,
  SpeedOptions,
} from 'Components/Session_/Player/Controls/components/ControlsComponents';
import {
  FullScreenButton,
  PlayButton,
  PlayTime,
  PlayingState,
} from 'App/player-ui';
import ControlButton from 'Components/Session_/Player/Controls/ControlButton';
import { SKIP_INTERVALS } from 'Components/Session_/Player/Controls/Controls';

import { getMockSessionById } from 'App/dev/mockSessions';
import { ReasonChip, CategoryLabel, ImpactGauge } from './ProblemCard';
import {
  PerformancePanel,
  GraphQLPanel,
  StatePanel,
  EventsPanel,
  ProfilerPanel,
  BackendLogsPanel,
} from './devPanels';
import sessionVideo from './sessionVideo';
import './issues.css';
import {
  MOCK_CLICKS,
  MOCK_LOCATIONS,
  MOCK_LOGS,
  MOCK_NETWORK,
} from './mockSessionData';

/* Full-screen session player for an issue's session — the real Spot player
   (location bar, video, timeline, controls, X-Ray / Console / Network panels)
   driven by spotPlayerStore, fed the recorded webm + mock mob data. Rendered
   via a portal so it covers the whole app. The header keeps the session info +
   More popover (reused look) and adds the issue name. The right sidebar offers
   Activity (real) and Issue (the rich AI context). */

type SideTab = 'activity' | 'issue' | null;

const SIDEBAR_W = 320;

/* The window (in seconds) where the AI located the issue, used to drive the
   issue indicators on the timeline and in the activity list. */
const ISSUE_START_S = 20;
const ISSUE_END_S = 30;

/* Activity list — the real session-replay Activity, not Spot's. Uses the shared
   EventGroupWrapper (same rows, grouping, current-event diamond + progress line
   as the session player) and the session header (framework export + "Search N
   events" + close), fed the mock events. A subtle red→orange gradient bar marks
   the activities that fall inside the issue window. */
const IssueActivity = observer(({ onClose }: { onClose: () => void }) => {
  const [query, setQuery] = React.useState('');
  const [searching, setSearching] = React.useState(false);

  // normalize the mock locations/clicks into the shape EventGroupWrapper expects
  const events = React.useMemo(() => {
    const merged = [
      ...spotPlayerStore.locations.map((e: any, i: number) => ({
        ...e,
        type: TYPES.LOCATION,
        url: e.location,
        key: `loc-${i}`,
      })),
      ...spotPlayerStore.clicks.map((e: any, i: number) => ({
        type: TYPES.CLICK,
        label: e.label,
        count: 1,
        time: e.time,
        key: `clk-${i}`,
      })),
    ];
    return merged.sort((a, b) => a.time - b.time);
  }, [spotPlayerStore.locations, spotPlayerStore.clicks]);

  const filtered = React.useMemo(() => {
    if (!query.trim()) return events;
    const q = query.toLowerCase();
    return events.filter((e: any) =>
      `${e.label ?? ''} ${e.url ?? ''}`.toLowerCase().includes(q),
    );
  }, [events, query]);

  const { index } = spotPlayerStore.getHighlightedEvent(
    spotPlayerStore.time,
    filtered,
  );
  const onEventClick = (_: any, event: any) =>
    spotPlayerStore.setTime(event.time / 1000);
  const inIssue = (t: number) =>
    t >= ISSUE_START_S * 1000 && t <= ISSUE_END_S * 1000;

  return (
    <div
      className="h-full bg-white border-l flex flex-col"
      style={{ minWidth: 320, width: 320, borderColor: 'var(--color-gray-light)' }}
    >
      {/* header — the real session-replay EventsBlock header (default-size
          controls, same gradient + CSS module), not Spot's */}
      <div
        className={cn(
          eventsStyles.header,
          'py-4 px-2 bg-linear-to-t from-transparent to-neutral-gray-lightest h-[57px] shrink-0',
        )}
      >
        {searching ? (
          <div className="flex items-center gap-2">
            <Input
              autoFocus
              allowClear
              className="rounded-lg"
              prefix={<SearchOutlined />}
              placeholder={`Filter ${filtered.length} events`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Button
              type="text"
              onClick={() => {
                setSearching(false);
                setQuery('');
              }}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Tooltip title="Export to test code" placement="bottom">
              <Button type="default" shape="circle">
                <Icon name="cypress" size={18} />
              </Button>
            </Tooltip>
            <Button
              className="flex items-center gap-2"
              onClick={() => setSearching(true)}
            >
              <Search size={14} />
              <div>Search {filtered.length} events</div>
            </Button>
            <Tooltip title="Close panel" placement="bottom">
              <Button
                className="ml-auto"
                type="text"
                onClick={onClose}
                icon={<CloseOutlined />}
              />
            </Tooltip>
          </div>
        )}
      </div>

      {/* event list — session-replay EventGroupWrapper rows, fed mock events */}
      <div
        className={cn(
          'flex-1 min-h-0 overflow-y-auto pb-4',
          eventsStyles.eventsList,
        )}
        data-openreplay-masked
      >
        {filtered.length === 0 ? (
          <div
            className="flex items-center gap-2 p-4"
            style={{ color: 'var(--color-gray-medium)' }}
          >
            <Icon name="binoculars" size={18} />
            <span>No matching results</span>
          </div>
        ) : (
          filtered.map((event: any, i: number) => {
            const isLastEvent = i === filtered.length - 1;
            const isLastInGroup =
              isLastEvent || filtered[i + 1]?.type === TYPES.LOCATION;
            return (
              <div key={event.key} className="relative">
                {inIssue(event.time) && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 3,
                      top: 0,
                      width: 3,
                      height: '100%',
                      background:
                        'linear-gradient(180deg, var(--color-red), var(--color-orange))',
                      opacity: 0.55,
                      zIndex: 97,
                      borderRadius: 2,
                    }}
                  />
                )}
                <EventGroupWrapper
                  query={query}
                  presentInSearch
                  isFirst={i === 0}
                  onEventClick={onEventClick}
                  onCheckboxClick={() => {}}
                  event={event}
                  isLastEvent={isLastEvent}
                  isLastInGroup={isLastInGroup}
                  isCurrent={i === index}
                  isSearched={false}
                  showSelection={false}
                  isNote={false}
                  isTabChange={false}
                  isIncident={false}
                  isPrev={i < index}
                  filterOutNote={() => {}}
                  setActiveTab={() => {}}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
});

function TagChip({ label }: { label: string }) {
  return (
    // one chip size across the Issues surface — the list's (smaller) size
    <span
      className="text-xs px-2 py-0.5 rounded-md border whitespace-nowrap"
      style={{
        borderColor: 'var(--color-gray-light)',
        background: 'var(--color-gray-lightest)',
        color: 'var(--color-gray-dark)',
      }}
    >
      {label}
    </span>
  );
}

/* Critical toggle for the header — the exact issue-list control (the
   `critical-toggle` icon button, red `critical-on` backdrop when set). Marking
   is instant; un-marking opens the same teaching-moment reason popover used on
   the detail page. Kept in sync with the slide-out via the shared issuesStore. */
const HeaderCriticalToggle = observer(({ issue }: { issue: Issue }) => {
  const { issuesStore } = useStore();
  const [open, setOpen] = React.useState(false);
  const [reasons, setReasons] = React.useState<string[]>([]);
  const [note, setNote] = React.useState('');

  const btn = (
    <Tooltip title={issue.critical ? 'Critical — click to remove' : 'Mark as critical'}>
      <Button
        type="text"
        size="small"
        aria-pressed={issue.critical}
        className={`critical-toggle flex items-center justify-center shrink-0${
          issue.critical ? ' critical-on' : ''
        }`}
        icon={
          <AlertTriangle
            size={15}
            strokeWidth={2}
            style={{
              color: issue.critical
                ? 'var(--color-red)'
                : 'var(--color-gray-medium)',
              fill: 'none',
            }}
          />
        }
        onClick={() => {
          if (issue.critical) setOpen(true);
          else issuesStore.setCritical(issue.id, true);
        }}
      />
    </Tooltip>
  );

  if (!issue.critical) return btn;

  const panel = (
    <div className="flex flex-col gap-2" style={{ width: 264 }}>
      <span className="text-sm" style={{ color: 'var(--color-gray-dark)' }}>
        Why is this not critical?
      </span>
      <div className="flex flex-wrap gap-1.5">
        {CRITICAL_REASONS.map((t) => (
          <ReasonChip
            key={t}
            label={t}
            checked={reasons.includes(t)}
            onChange={(on) =>
              setReasons((p) => (on ? [...p, t] : p.filter((x) => x !== t)))
            }
          />
        ))}
      </div>
      <Input.TextArea
        rows={2}
        placeholder="Add a note (optional)…"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="flex justify-end gap-2">
        <Button size="small" type="text" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button
          size="small"
          type="primary"
          danger
          onClick={() => {
            issuesStore.setCritical(
              issue.id,
              false,
              [...reasons, note.trim()].filter(Boolean).join(' · '),
            );
            setOpen(false);
            setReasons([]);
            setNote('');
          }}
        >
          Mark as not critical
        </Button>
      </div>
    </div>
  );

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      placement="bottomLeft"
      content={panel}
      zIndex={2147483647}
    >
      {btn}
    </Popover>
  );
});

/* Break a journey sentence into ordered steps so it can be drawn as a path
   rather than read as prose ("they won't read it"). Splits on clause commas
   and strips leading connectors. */
function toJourneySteps(journey: string): string[] {
  if (!journey) return [];
  return journey
    .replace(/\.+$/, '')
    .split(/,\s*/)
    .map((s) => s.replace(/^(and then|and|then)\s+/i, '').trim())
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1));
}

/* Spread the session's behavioural tags across its journey steps so each tag
   sits on the moment it describes (last step always gets the terminal tag).
   Returns a map of stepIndex -> tag. */
function spreadTagsOverSteps(
  stepCount: number,
  tags: string[],
): Record<number, string> {
  const map: Record<number, string> = {};
  const m = tags.length;
  if (!m || !stepCount) return map;
  tags.forEach((tag, i) => {
    const pos =
      m === 1 ? stepCount - 1 : Math.round((i * (stepCount - 1)) / (m - 1));
    map[pos] = tag;
  });
  return map;
}

/* Place each journey step on the session timeline. Earlier steps spread evenly
   from a small lead-in up to the moment the issue starts; the final step (the
   drop-off / the issue itself) lands on the issue moment, so clicking it seeks
   the player to exactly when it happened. Times are in seconds. */
function stepTimes(n: number): number[] {
  if (n <= 0) return [];
  if (n === 1) return [ISSUE_START_S];
  const lead = 2;
  return Array.from(
    { length: n },
    (_, i) => lead + ((ISSUE_START_S - lead) * i) / (n - 1),
  );
}

function fmtTime(s: number): string {
  const total = Math.max(0, Math.round(s));
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

/* Journey tab — the user's path as a light, single system: a hairline rail
   (the session-replay Activity blue, #A7BFFF) with small nodes, each step's
   behavioural tag sitting inline on it so tags and steps read as one thing.
   The final step is the drop-off, in red. No separate tag row, no heavy
   markers, no prose paragraph. Each step is clickable: it seeks the player to
   the moment that step happened, and the step under the playhead is
   highlighted. */
const RAIL = '#A7BFFF';
const STEP_BLUE = '#394EFF';
// Height of the rail segment above each dot. It both positions the dot level
// with its step's first text line and (when colored) connects to the previous
// step's rail, so the line stays continuous while each pill keeps even padding.
const RAIL_LEAD = 14;
const JourneyView = observer(({ card }: { card?: IssueSessionCard }) => {
  const steps = toJourneySteps(card?.journey ?? '');
  const stepTags = spreadTagsOverSteps(steps.length, card?.tags ?? []);
  if (steps.length === 0) return null;
  const times = stepTimes(steps.length);
  // the current step is the last one whose moment the playhead has reached
  const now = spotPlayerStore.time;
  let current = 0;
  times.forEach((t, i) => {
    if (now >= t - 0.5) current = i;
  });
  return (
    <div className="flex flex-col">
      {steps.map((s, i) => {
        const last = i === steps.length - 1;
        const tag = stepTags[i];
        const active = i === current;
        const dot = last ? 'var(--color-red)' : STEP_BLUE;
        return (
          <div
            key={i}
            role="button"
            tabIndex={0}
            title={`Jump to ${fmtTime(times[i])}`}
            onClick={() => spotPlayerStore.setTime(times[i])}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                spotPlayerStore.setTime(times[i]);
              }
            }}
            className={`group flex gap-2.5 -mx-2 px-2 rounded cursor-pointer transition-colors ${
              last ? 'hover:bg-red-lightest' : 'hover:bg-active-blue'
            }`}
            style={{
              background: active
                ? last
                  ? 'var(--color-red-lightest)'
                  : 'var(--color-active-blue)'
                : undefined,
            }}
          >
            <div className="flex flex-col items-center shrink-0" style={{ width: 7 }}>
              {/* lead: positions the dot level with the first line; colored
                  (except on the first step) so it connects to the rail above */}
              <span
                style={{ height: RAIL_LEAD, width: 1, background: i === 0 ? 'transparent' : RAIL }}
              />
              <span
                style={{
                  width: active ? 8 : 6,
                  height: active ? 8 : 6,
                  borderRadius: 9999,
                  background: dot,
                  boxShadow: active ? `0 0 0 3px ${last ? 'var(--color-red-lightest)' : 'rgba(57,78,255,0.18)'}` : undefined,
                }}
              />
              {!last && (
                <span style={{ flex: 1, width: 1, minHeight: 8, background: RAIL }} />
              )}
            </div>
            <div className="py-2 flex flex-col items-start gap-2 min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2 w-full">
                <span
                  style={{
                    fontSize: 13,
                    lineHeight: 1.45,
                    color: last ? 'var(--color-red)' : 'var(--color-gray-dark)',
                    fontWeight: last || active ? 500 : 400,
                  }}
                >
                  {s}
                </span>
                <span
                  className="shrink-0 flex items-center gap-1 tabular-nums"
                  style={{ fontSize: 11, color: 'var(--color-gray-medium)' }}
                >
                  <Play
                    size={9}
                    strokeWidth={0}
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                    style={{ fill: last ? 'var(--color-red)' : STEP_BLUE }}
                  />
                  {fmtTime(times[i])}
                </span>
              </div>
              {tag && <TagChip label={tag} />}
            </div>
          </div>
        );
      })}
    </div>
  );
});

/* Details tab — the issue described plainly, with the suggested fix folded in
   below (not its own tab: many non-UI/UX issues have no clean fix, so it lives
   here as a secondary section rather than a permanent tab). */
function DetailsView({ issue }: { issue: Issue }) {
  const textStyle = {
    color: 'var(--color-gray-dark)',
    fontSize: 15,
    lineHeight: 1.65,
  };
  const eyebrow = (
    text: string,
  ) => (
    <span
      className="text-xs font-semibold uppercase"
      style={{ color: 'var(--color-gray-medium)', letterSpacing: '0.05em' }}
    >
      {text}
    </span>
  );
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        {eyebrow('The problem')}
        <span style={textStyle}>{issue.real}</span>
      </div>
      {issue.fix && (
        <div
          className="flex flex-col gap-1.5 pt-3 border-t"
          style={{ borderColor: 'var(--color-gray-light)' }}
        >
          {eyebrow('Suggested fix')}
          <span style={textStyle}>{issue.fix}</span>
        </div>
      )}
    </div>
  );
}

/* Slide-out context as two tabs: Journey (the path, via tags + steps) and
   Details (the plain-language problem + suggested fix). */
function IssueContextTabs({
  issue,
  card,
}: {
  issue: Issue;
  card?: IssueSessionCard;
}) {
  const [view, setView] = React.useState<'journey' | 'details'>('journey');
  return (
    <div className="flex flex-col gap-3">
      <Segmented
        block
        value={view}
        onChange={(v) => setView(v as 'journey' | 'details')}
        options={[
          { label: 'Journey', value: 'journey' },
          { label: 'Details', value: 'details' },
        ]}
      />
      {view === 'journey' ? (
        <JourneyView card={card} />
      ) : (
        <DetailsView issue={issue} />
      )}
    </div>
  );
}

const X_Ray = observer(() => {
  const endTime = spotPlayerStore.duration * 1000;
  const time = spotPlayerStore.time * 1000;
  const resourceList = spotPlayerStore.network
    .filter((r: any) => r.isRed || r.isYellow || (r.status && r.status >= 400))
    .filter((i: any) => i.type === 'xhr' || i.type === 'fetch');
  const exceptionsList = spotPlayerStore.logs.filter(
    (l: any) => l.level === 'error',
  );
  return (
    <SpotOverviewPanelCont
      exceptionsList={exceptionsList}
      resourceList={resourceList}
      spotTime={time}
      spotEndTime={endTime}
      onClose={() => spotPlayerStore.setActivePanel(null)}
      time={time}
    />
  );
});

/* Developer-tools tab set, matching the real session replay (not Spot's
   reduced X-Ray/Console/Network). 'overview' = X-Ray. */
type DevTab =
  | 'overview'
  | 'console'
  | 'network'
  | 'performance'
  | 'graphql'
  | 'state'
  | 'events'
  | 'profiler'
  | 'backend';
const DEV_TABS: { key: DevTab; label: string }[] = [
  { key: 'overview', label: 'X-Ray' },
  { key: 'console', label: 'Console' },
  { key: 'network', label: 'Network' },
  { key: 'performance', label: 'Performance' },
  { key: 'graphql', label: 'GraphQL' },
  { key: 'state', label: 'State' },
  { key: 'events', label: 'Events' },
  { key: 'profiler', label: 'Profiler' },
  { key: 'backend', label: 'Backend Logs' },
];

/* The player's bottom control bar — mirrors the real session-replay controls
   (play / seek / speed + the full developer-tools tab row), not Spot's reduced
   bar. Built here (rather than reusing SpotPlayerControls) so the demo can show
   every session tab; the tab buttons drive local `devTab` state. */
const IssueDevControls = observer(
  ({
    devTab,
    setDevTab,
  }: {
    devTab: DevTab | null;
    setDevTab: (t: DevTab | null) => void;
  }) => {
    const togglePlay = () => {
      if (spotPlayerStore.state === PlayingState.Completed) {
        spotPlayerStore.setTime(0);
        spotPlayerStore.setIsPlaying(true);
      }
      spotPlayerStore.setIsPlaying(!spotPlayerStore.isPlaying);
    };
    const back = () =>
      spotPlayerStore.setTime(spotPlayerStore.time - spotPlayerStore.skipInterval);
    const forth = () =>
      spotPlayerStore.setTime(spotPlayerStore.time + spotPlayerStore.skipInterval);
    const toggle = (t: DevTab) => setDevTab(devTab === t ? null : t);

    return (
      <div className="hidden lg:flex w-full p-4 items-center gap-4 bg-white">
        <PlayButton togglePlay={togglePlay} state={spotPlayerStore.state} iconSize={36} />
        <div className="px-2 py-1 bg-white rounded-sm font-semibold flex items-center gap-2">
          <PlayTime isCustom time={spotPlayerStore.time * 1000} format="mm:ss" />
          <span>/</span>
          <div>{spotPlayerStore.durationString}</div>
        </div>
        <div
          className="rounded-sm ml-1 bg-white border-gray-lighter flex items-center"
          style={{ gap: 1 }}
        >
          <JumpBack backTenSeconds={back} currentInterval={spotPlayerStore.skipInterval} />
          <IntervalSelector
            skipIntervals={SKIP_INTERVALS}
            setSkipInterval={spotPlayerStore.setSkipInterval}
            currentInterval={spotPlayerStore.skipInterval}
          />
          <JumpForward forthTenSeconds={forth} currentInterval={spotPlayerStore.skipInterval} />
        </div>
        <SpeedOptions
          toggleSpeed={(s: number) => spotPlayerStore.setPlaybackRate(SPEED_OPTIONS[s])}
          disabled={false}
          speed={spotPlayerStore.playbackRate}
        />

        <div className="ml-auto flex items-center gap-1 overflow-x-auto">
          {DEV_TABS.map((t) => (
            <ControlButton
              key={t.key}
              label={t.label}
              onClick={() => toggle(t.key)}
              active={devTab === t.key}
            />
          ))}
        </div>

        <FullScreenButton
          size={18}
          onClick={() => spotPlayerStore.setIsFullScreen(true)}
        />
      </div>
    );
  },
);

function IssueSessionPlayer() {
  const history = useHistory();
  const { projectsStore, issuesStore } = useStore();
  const siteId = projectsStore.activeSiteId;
  const { sessionId } = useParams<{ sessionId: string }>();
  const sess = getMockSessionById(sessionId);

  // which issue owns this session (drives the header + Issue tab)
  const issue: Issue | undefined = issuesStore.all.find((i: Issue) =>
    (i.sessionIds ?? []).includes(sessionId),
  );
  const card: IssueSessionCard | undefined = issue
    ? issuesStore.exampleSessions(issue).find((c) => c.sessionId === sessionId)
    : undefined;

  // user metadata — customer-defined, can be many; shown as wrapping pills in
  // the header "More" popover (hidden by default), compact enough for dozens.
  const metaList = sess?.metadata
    ? Object.entries(sess.metadata).map(([label, value]) => ({ label, value }))
    : card?.plan
      ? [{ label: 'plan', value: card.plan }]
      : [];

  const [panelHeight, setPanelHeight] = React.useState(getDefaultPanelHeight());
  const [tab, setTab] = React.useState<SideTab>('issue');
  const [devTab, setDevTab] = React.useState<DevTab | null>(null);
  const [autoplay, setAutoplay] = React.useState(false);
  const [bookmarked, setBookmarked] = React.useState(false);

  const email = card?.email ?? sess?.userId ?? 'anonymous';
  const browser = card?.browser ?? sess?.userBrowser ?? 'Chrome';
  const os = card?.os ?? sess?.userOs ?? 'Mac OS X';
  const device = card?.device ?? sess?.userDeviceType ?? 'desktop';
  const countryCode = card?.country ?? sess?.userCountry ?? '';
  const city = card?.city ?? sess?.userCity ?? '';
  const date = sess?.startTs
    ? new Date(sess.startTs).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Today';

  // this session is a VARIATION of the issue — lead the header with it,
  // and keep the parent issue as context on the line below
  const variation = card?.variation || card?.journey || issue?.head;

  // queue controls navigate across this issue's example sessions
  const sessions = issue ? issuesStore.exampleSessions(issue).slice(0, 3) : [];
  const sessIdx = sessions.findIndex((c) => c.sessionId === sessionId);
  const prevId = sessIdx > 0 ? sessions[sessIdx - 1].sessionId : null;
  const nextId =
    sessIdx >= 0 && sessIdx < sessions.length - 1
      ? sessions[sessIdx + 1].sessionId
      : null;
  const goSession = (sid: string) =>
    history.push(withSiteId(issueSessionRoute(sid), siteId));

  const toggleAutoplay = () => {
    const next = !autoplay;
    setAutoplay(next);
    next ? message.success('Autoplay is ON') : message.info('Autoplay is OFF');
  };
  const toggleBookmark = () => {
    const next = !bookmarked;
    setBookmarked(next);
    message.success(
      next
        ? 'Session added to your bookmarks'
        : 'Session removed from your bookmarks',
    );
  };

  React.useEffect(() => {
    spotPlayerStore.clearData();
    spotPlayerStore.setStartTs(0);
    spotPlayerStore.setDuration('1:01');
    spotPlayerStore.setDeviceData('144.0.0', '1440x900', os);
    spotPlayerStore.setEvents(
      MOCK_LOGS as any,
      MOCK_LOCATIONS as any,
      MOCK_CLICKS as any,
      MOCK_NETWORK as any,
    );
    spotPlayerStore.setIsPlaying(true);

    const ev = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.key === 'Escape') spotPlayerStore.setIsFullScreen(false);
      if (e.key === ' ')
        spotPlayerStore.setIsPlaying(!spotPlayerStore.isPlaying);
    };
    document.addEventListener('keydown', ev);
    return () => {
      document.removeEventListener('keydown', ev);
      spotPlayerStore.clearData();
    };
  }, []);

  const handleResize = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = panelHeight;
    const onMove = (ev: MouseEvent) => {
      const diff = startHeight - (ev.clientY - startY);
      const max = diff > window.innerHeight / 1.5 ? window.innerHeight / 1.5 : diff;
      setPanelHeight(Math.max(50, max));
      debounceUpdate(Math.max(50, max));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const back = () =>
    history.push(
      withSiteId(
        issue ? issueDetailRoute(String(issue.id)) : issuesRoute(),
        siteId,
      ),
    );
  const { isFullScreen } = spotPlayerStore;
  const Divider = () => (
    <div className="h-6 border-l mx-1" style={{ borderColor: 'var(--color-gray-light)' }} />
  );

  const CatIc = issue ? CAT_ICON[issue.cat] : null;
  const morePopover = (
    <div className="text-left bg-white">
      {issue && CatIc && (
        <SessionInfoItem
          comp={<CatIc size={16} strokeWidth={2} style={{ color: '#3EAAAF' }} />}
          label="Category"
          value={issue.cat}
        />
      )}
      <SessionInfoItem
        comp={
          <User size={16} strokeWidth={2} style={{ color: 'var(--color-gray-medium)' }} />
        }
        label="User"
        value={email}
      />
      <SessionInfoItem
        comp={<CountryFlag country={countryCode} />}
        label={countries[countryCode] || countryCode || 'Unknown'}
        value={city}
      />
      <SessionInfoItem icon={browserIcon(browser)} label={browser} value="v144.0.0" />
      <SessionInfoItem icon={osIcon(os)} label={os} value="10.15.7" />
      <SessionInfoItem
        icon={deviceTypeIcon(device)}
        label={device}
        value="1440 × 900"
        isLast={metaList.length === 0}
      />
      {/* User metadata — customer-defined, can be many (Mehdi: up to 10/15+).
          Hidden behind "More", rendered as wrapping pills so dozens stay
          compact instead of a tall one-row-per-field list. */}
      {metaList.length > 0 && (
        <div className="pt-3" style={{ maxWidth: 320 }}>
          <div
            className="px-2 pb-2 text-xs font-semibold uppercase color-gray-medium"
            style={{ letterSpacing: '0.05em' }}
          >
            Metadata
          </div>
          <div className="px-2 flex flex-wrap gap-1">
            {metaList.map((m) => (
              <MetaItem key={m.label} label={m.label} value={m.value} />
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const content = (
    <div className="fixed inset-0 bg-white flex flex-col overflow-hidden" style={{ zIndex: 2147482000 }}>
      {isFullScreen && (
        <EscapeButton onClose={() => spotPlayerStore.setIsFullScreen(false)} />
      )}

      {/* header: session info + issue name, with Activity / Issue tabs */}
      {!isFullScreen && (
        <div className="flex items-center gap-1 px-2 py-2.5 w-full bg-white border-b" style={{ borderColor: 'var(--color-gray-light)' }}>
          <Tooltip title={issue ? `Back to “${issue.head}”` : 'Back to issues'}>
            <Button type="text" size="small" icon={<ArrowLeft size={15} />} onClick={back} className="px-2">
              Back to issue
            </Button>
          </Tooltip>
          <Divider />
          {/* Lead with this session's VARIATION of the issue (what the card was
              titled by); the parent issue + who/when sit on the line below, and
              the environment specs live behind "More". */}
          <div className="leading-tight min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              {issue && <HeaderCriticalToggle issue={issue} />}
              <Tooltip title={variation}>
                <span
                  className="font-medium truncate"
                  style={{ color: 'var(--color-gray-darkest)', maxWidth: 480 }}
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
              <span className="whitespace-nowrap">{date}</span>
              <span>·</span>
              <Popover
                content={morePopover}
                trigger="hover"
                placement="bottom"
                zIndex={2147483647}
              >
                <span className="link cursor-pointer">More</span>
              </Popover>
            </div>
          </div>

          {/* right cluster — sourced from the session replay subheader:
              Share (copy-at-time), Highlight, overflow, queue controls, tabs */}
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <Popover
              trigger="click"
              placement="bottomRight"
              zIndex={2147483647}
              content={
                <div style={{ width: 248 }}>
                  <SessionCopyLink time={spotPlayerStore.time} />
                </div>
              }
            >
              <Tooltip title="Share session" placement="bottom">
                <Button size="small" icon={<ShareAltOutlined />} />
              </Tooltip>
            </Popover>

            <HighlightButton onClick={() => message.info('Highlight this moment')} />

            <Dropdown
              placement="bottomRight"
              menu={{
                items: [
                  {
                    key: 'bookmark',
                    label: (
                      <div className="flex items-center gap-2">
                        {bookmarked ? (
                          <BookmarkCheck size={16} strokeWidth={1.5} />
                        ) : (
                          <Bookmark size={16} strokeWidth={1.5} />
                        )}
                        <span>{bookmarked ? 'Bookmarked' : 'Bookmark'}</span>
                      </div>
                    ),
                    onClick: toggleBookmark,
                  },
                  {
                    key: 'dl',
                    label: (
                      <div className="flex items-center gap-2">
                        <File size={16} strokeWidth={1.5} />
                        <span>Download video</span>
                      </div>
                    ),
                  },
                ],
              }}
            >
              <Button icon={<MoreOutlined />} size="small" />
            </Dropdown>

            <Divider />

            {/* queue controls — prev / autoplay / next across this issue's sessions */}
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
                  onClick={() => prevId && goSession(prevId)}
                  icon={<LeftOutlined />}
                />
              </Tooltip>
              <Tooltip title="Toggle autoplay" placement="bottom">
                <Switch
                  className="custom-switch"
                  checked={autoplay}
                  onChange={toggleAutoplay}
                  checkedChildren={<CaretRightOutlined className="switch-icon" />}
                  unCheckedChildren={<PauseOutlined className="switch-icon" />}
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
                  onClick={() => nextId && goSession(nextId)}
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
              active={tab}
              onClick={(k: any) => (k === tab ? setTab(null) : setTab(k))}
            />
          </div>
        </div>
      )}

      {/* body: player column (shrinks) + right sidebar */}
      <div className="flex flex-1 min-h-0 w-full">
        <div className="flex flex-col flex-1 min-w-0 min-h-0">
          <SpotLocation />
          <div className={cn('w-full min-h-0 flex-1', isFullScreen ? '' : 'relative')}>
            <SpotVideoContainer
              videoURL={sessionVideo}
              checkReady={() => Promise.resolve(true)}
            />
          </div>

          {!isFullScreen && devTab ? (
            <div
              className="shrink-0 relative overflow-hidden bg-white border-t"
              style={{
                height: panelHeight,
                width: '100%',
                borderColor: 'var(--color-gray-light)',
              }}
            >
              <div
                onMouseDown={handleResize}
                className="w-full h-2 cursor-ns-resize absolute top-0 left-0 z-20"
              />
              <div className="w-full h-full bg-white">
                {devTab === 'console' && (
                  <SpotConsole onClose={() => setDevTab(null)} />
                )}
                {devTab === 'network' && (
                  <SpotNetwork onClose={() => setDevTab(null)} panelHeight={panelHeight} />
                )}
                {devTab === 'overview' && <X_Ray />}
                {devTab === 'performance' && <PerformancePanel />}
                {devTab === 'graphql' && <GraphQLPanel />}
                {devTab === 'state' && <StatePanel />}
                {devTab === 'events' && <EventsPanel />}
                {devTab === 'profiler' && <ProfilerPanel />}
                {devTab === 'backend' && <BackendLogsPanel />}
              </div>
            </div>
          ) : null}

          {/* timeline + issue indicators overlaid (player untouched). Sits
              above the blue progress bar (zIndex) so it always reads clearly. */}
          <div className="relative">
            <SpotTimeline />
            <div
              className="pointer-events-none absolute inset-0"
              style={{ zIndex: 40 }}
            >
              {/* issue glow — gradient centered on the issue marker, fading out
                  symmetrically both ways to convey the fuzzy issue location */}
              <div
                className="absolute top-0 bottom-0"
                style={{
                  left: `${((ISSUE_START_S - 6) / 61) * 100}%`,
                  width: `${(12 / 61) * 100}%`,
                  background:
                    'linear-gradient(to right, transparent, rgba(204,0,0,0.28) 50%, transparent)',
                }}
              />
              {/* bold tick at the issue moment, with a white halo to lift it
                  off the blue bar */}
              <div
                className="absolute top-0 bottom-0"
                style={{
                  left: `${(ISSUE_START_S / 61) * 100}%`,
                  width: 3,
                  transform: 'translateX(-50%)',
                  background: 'var(--color-red)',
                  boxShadow: '0 0 0 1.5px rgba(255,255,255,0.85)',
                }}
              />
              {/* prominent marker dot, white ring + shadow */}
              <div
                className="absolute"
                style={{
                  left: `${(ISSUE_START_S / 61) * 100}%`,
                  top: '50%',
                  transform: 'translate(-50%,-50%)',
                  width: 16,
                  height: 16,
                  borderRadius: 9999,
                  background: 'var(--color-red)',
                  border: '2.5px solid white',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
                }}
              />
            </div>
          </div>
          {isFullScreen ? null : (
            <IssueDevControls devTab={devTab} setDevTab={setDevTab} />
          )}
        </div>

        {/* right sidebar — Activity (real) or Issue (rich AI context) */}
        {!isFullScreen && tab === 'activity' && (
          <div className="shrink-0 min-h-0" style={{ width: SIDEBAR_W }}>
            <IssueActivity onClose={() => setTab(null)} />
          </div>
        )}

        {!isFullScreen && tab === 'issue' && issue && (
          <div
            className="flex flex-col shrink-0 min-h-0 border-l bg-white"
            style={{ width: SIDEBAR_W, borderColor: 'var(--color-gray-light)' }}
          >
            <div
              className="flex items-center justify-between p-3 border-b"
              style={{ borderColor: 'var(--color-gray-light)' }}
            >
              <span className="font-medium text-lg">Issue</span>
              <Button type="text" size="small" onClick={() => setTab(null)}>
                <CloseOutlined />
              </Button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-5">
              {/* 1 · the issue — labelled "ISSUE" so the issue title is never
                  confused with this session's variation below */}
              <div className="flex flex-col gap-2.5">
                <span
                  className="text-xs font-semibold uppercase"
                  style={{
                    color: 'var(--color-gray-medium)',
                    letterSpacing: '0.05em',
                  }}
                >
                  Issue
                </span>
                <span
                  className="font-semibold"
                  style={{
                    color: 'var(--color-gray-darkest)',
                    fontSize: 17,
                    lineHeight: 1.35,
                  }}
                >
                  {issue.head}
                </span>
                <div
                  className="flex items-center gap-2.5 flex-wrap"
                  style={{ color: 'var(--color-gray-medium)' }}
                >
                  <CategoryLabel cat={issue.cat} />
                  <span style={{ color: 'var(--color-gray-light)' }}>|</span>
                  <Tooltip title={`${impactLevel(issue.impact)} impact`}>
                    <span className="inline-flex items-center cursor-default">
                      <ImpactGauge value={issue.impact} />
                    </span>
                  </Tooltip>
                  <span style={{ color: 'var(--color-gray-light)' }}>|</span>
                  <HeaderCriticalToggle issue={issue} />
                </div>
              </div>

              {/* 2 · this session — just the variation title (this session's
                  take on the issue). Tags + journey now live in the Journey
                  tab; metadata lives in the header "More" popover. */}
              {card?.variation && (
                <div className="flex flex-col gap-1.5">
                  <span
                    className="text-xs font-semibold uppercase"
                    style={{
                      color: 'var(--color-gray-medium)',
                      letterSpacing: '0.05em',
                    }}
                  >
                    This session
                  </span>
                  <span
                    className="font-medium"
                    style={{
                      color: 'var(--color-gray-darkest)',
                      fontSize: 15,
                      lineHeight: 1.4,
                    }}
                  >
                    {card.variation}
                  </span>
                </div>
              )}

              {/* 3 · Journey (path via tags + steps) and Details (problem + fix) */}
              <IssueContextTabs issue={issue} card={card} />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(
    <ConfigProvider theme={{ token: { zIndexPopupBase: 2147483000 } }}>
      {content}
    </ConfigProvider>,
    document.body,
  );
}

export default observer(IssueSessionPlayer);
