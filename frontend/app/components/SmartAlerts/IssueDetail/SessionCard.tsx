import { cityAfterCode } from '@/lib/geo';
import { useCopy } from '@/lib/use-copy';
import { IconButton } from '@/ui/actions/IconButton';
import { Chip } from '@/ui/data/Chip';
import { GeoPlace, focusPanelOnOpen } from '@/ui/data/GeoCredit';
import { MoreCount } from '@/ui/data/MoreCount';
import { RelativeTime } from '@/ui/data/RelativeTime';
import { PopoverPanel } from '@/ui/overlays/popover';
import { Tooltip } from '@/ui/overlays/tooltip';
import { Check, Link2, MoreHorizontal, Play } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { MetaChips } from 'Shared/SessionsTable/MetaChips';

import { type IssueSessionCard } from '../shared';
import './session-card.css';

/** One sampled session: the still at the issue moment and who it was. */
export default function SessionCard({
  s,
  onClick,
  shareUrl,
}: {
  s: IssueSessionCard;
  onClick: () => void;
  shareUrl?: string;
}) {
  const { t } = useTranslation();
  const { copy, done } = useCopy();
  const [more, setMore] = React.useState(false);
  const title = s.variation || s.journey || s.email;
  const place = [cityAfterCode(s.city, s.country), s.country]
    .filter(Boolean)
    .join(', ');
  const meta = Object.fromEntries(s.metadata.map((m) => [m.label, m.value]));
  const details: [string, React.ReactNode][] = [
    [t('Browser'), s.browser],
    [t('OS'), s.os],
    [t('Location'), place && <GeoPlace>{place}</GeoPlace>],
    [
      t('Metadata'),
      s.metadata.length > 0 && (
        <MetaChips metadata={meta} max={s.metadata.length} />
      ),
    ],
  ];
  return (
    <div
      role="button"
      tabIndex={0}
      className="m-scard"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={t('Watch the session of {{who}}', { who: s.email })}
    >
      <span className="m-scard__shot">
        <span className="m-scard__frame">
          {s.thumbnail ? (
            <img className="m-scard__img" src={s.thumbnail} alt="" />
          ) : null}
        </span>
        <span className="m-scard__badges">
          {shareUrl && (
            <Tooltip title={done ? t('Link copied') : t('Copy link')}>
              <button
                type="button"
                className="m-scard__link"
                aria-label={t('Copy link')}
                onClick={(e) => {
                  e.stopPropagation();
                  void copy(shareUrl);
                }}
              >
                {done ? <Check size={12} /> : <Link2 size={12} />}
              </button>
            </Tooltip>
          )}
          <span className="m-scard__dur m-mono">{s.dur}</span>
        </span>
        <span className="m-scard__play" aria-hidden="true">
          <Play size={14} />
        </span>
      </span>
      <Tooltip title={title} delay={600}>
        <span className="m-scard__variation">{title}</span>
      </Tooltip>
      {s.tags.length > 0 && (
        <span className="m-scard__tags">
          {s.tags.slice(0, 2).map((tag) => (
            <Chip key={tag} kind="tag">
              {tag}
            </Chip>
          ))}
          <MoreCount hidden={s.tags.slice(2)} />
        </span>
      )}
      <span className="m-scard__foot">
        <span className="m-scard__who m-truncate">{s.email}</span>
        {s.startTs ? (
          <span className="m-scard__when">
            <RelativeTime at={s.startTs} />
          </span>
        ) : null}
        <PopoverPanel
          open={more}
          onOpenChange={setMore}
          placement="bottomRight"
          onOpenAutoFocus={focusPanelOnOpen}
          content={
            // the panel is portaled, but its events still bubble to the card
            <dl
              className="m-scard__details"
              onClick={(e) => e.stopPropagation()}
            >
              {details
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <React.Fragment key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </React.Fragment>
                ))}
            </dl>
          }
        >
          <span className="m-scard__more" onClick={(e) => e.stopPropagation()}>
            <IconButton
              icon={<MoreHorizontal size={14} />}
              label={t('More details')}
              variant="ghost"
              size="xs"
              open={more}
            />
          </span>
        </PopoverPanel>
      </span>
    </div>
  );
}
