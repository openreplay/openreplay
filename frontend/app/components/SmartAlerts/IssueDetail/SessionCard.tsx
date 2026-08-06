import { PlayCircleOutlined } from '@ant-design/icons';
import { Popover, Tooltip } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { countries } from 'App/constants';
import { browserIcon, deviceTypeIcon, osIcon } from 'App/iconNames';
import { capitalize } from 'App/utils';
import SessionInfoItem from 'Components/Session_/SessionInfoItem';
import { CountryFlag } from 'UI';

import { type IssueSessionCard } from '../shared';
import TagsRow from './TagsRow';

const LINE = 1.35; // title line-height (em)

/* The variation title, clamped to the grid-agreed number of lines. A hidden
   unclamped clone reports its natural line count up so the grid can size every
   title slot (≤3 lines). Truncated text shows in full on hover. */
function ClampedTitle({
  text,
  lines,
  onNaturalLines,
}: {
  text: string;
  /** the grid-agreed slot height, in lines */
  lines: number;
  /** reports how many lines this title would take unclamped */
  onNaturalLines: (n: number) => void;
}) {
  const measureRef = React.useRef<HTMLSpanElement>(null);
  const [natural, setNatural] = React.useState(1);
  React.useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el) return undefined;
    const report = () => {
      // re-read the ref and skip detached nodes: ResizeObserver fires a final
      // 0-size event for removed elements, which would reset the count
      const node = measureRef.current;
      if (!node || !node.isConnected) return;
      const lineHeight = parseFloat(getComputedStyle(node).lineHeight) || 1;
      const n = Math.max(1, Math.round(node.scrollHeight / lineHeight));
      setNatural(n);
      onNaturalLines(n);
    };
    report();
    const ro = new ResizeObserver(report);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text, onNaturalLines]);

  const styleBase: React.CSSProperties = {
    color: 'var(--color-gray-darkest)',
    lineHeight: LINE,
  };
  return (
    <Tooltip title={natural > lines ? text : ''}>
      <span className="relative block">
        {/* hidden unclamped clone — the line-count measurement */}
        <span
          ref={measureRef}
          aria-hidden
          className="text-sm font-medium invisible absolute inset-x-0 top-0"
          style={styleBase}
        >
          {text}
        </span>
        <span
          className="text-sm font-medium"
          style={{
            ...styleBase,
            display: '-webkit-box',
            WebkitLineClamp: lines,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            height: `${lines * LINE}em`,
          }}
        >
          {text}
        </span>
      </span>
    </Tooltip>
  );
}

/* A session card titled by its issue variation. Footer rows have fixed heights
   (shared title slot + one-line tags row) so all cards in the grid match size. */
export default function SessionCard({
  s,
  onClick,
  titleLines,
  onTitleLines,
}: {
  s: IssueSessionCard;
  onClick: () => void;
  /** grid-agreed title slot, in lines (max the visible cards need, ≤3) */
  titleLines: number;
  onTitleLines: (sessionId: string, n: number) => void;
}) {
  const { t } = useTranslation();
  const reportLines = React.useCallback(
    (n: number) => onTitleLines(s.sessionId, n),
    [onTitleLines, s.sessionId],
  );
  return (
    <div className="bg-white rounded-lg overflow-hidden shadow-xs border transition hover:border-teal">
      <button
        onClick={onClick}
        aria-label={t('Open session replay')}
        className="relative group w-full block cursor-pointer bg-gray-lightest"
        style={{ height: 180 }}
      >
        {/* real thumbnail when the backend has one; otherwise the neutral play surface */}
        {s.thumbnail && (
          <img
            src={s.thumbnail}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div
          className={`absolute inset-0 flex items-center justify-center transition-colors ${
            s.thumbnail
              ? 'bg-black/10 opacity-0 group-hover:opacity-100'
              : 'group-hover:bg-teal/10'
          }`}
        >
          <PlayCircleOutlined
            style={{ fontSize: 44 }}
            className={s.thumbnail ? 'text-white' : 'color-gray-medium'}
          />
        </div>
        <div className="absolute bottom-2 right-2 bg-gray-dark text-white py-1 px-2 text-xs rounded-lg">
          {s.dur}
        </div>
      </button>

      <div className="border-t px-3 py-3 flex flex-col gap-2">
        <ClampedTitle
          text={s.variation || s.journey || s.email}
          lines={titleLines}
          onNaturalLines={reportLines}
        />
        {/* fixed-height row so tags (always one line) never shift the footer */}
        <div className="flex items-center" style={{ height: 24 }}>
          <TagsRow tags={s.tags} />
        </div>
        <div className="flex items-center justify-between text-xs color-gray-medium">
          <span className="whitespace-nowrap">{s.date}</span>
          <Popover
            trigger="hover"
            placement="top"
            content={
              <div className="text-left bg-white" style={{ minWidth: 230 }}>
                <SessionInfoItem
                  comp={<CountryFlag country={s.country} />}
                  label={countries[s.country] || s.country || t('Unknown')}
                  value={s.loc}
                />
                {s.browser && (
                  <SessionInfoItem
                    icon={browserIcon(s.browser)}
                    label={s.browser}
                    value=""
                  />
                )}
                {s.os && (
                  <SessionInfoItem icon={osIcon(s.os)} label={s.os} value="" />
                )}
                <SessionInfoItem
                  icon={deviceTypeIcon(s.device)}
                  label={capitalize(s.device)}
                  value=""
                />
                <SessionInfoItem
                  label={t('Events')}
                  value={String(s.events)}
                  isLast
                />
              </div>
            }
          >
            <span
              className="link cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            >
              {t('More')}
            </span>
          </Popover>
        </div>
      </div>
    </div>
  );
}
