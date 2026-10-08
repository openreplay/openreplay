import { useCopy } from '@/lib/use-copy';
import { Chip } from '@/ui/data/Chip';
import { MoreCount } from '@/ui/data/MoreCount';
import { Tooltip } from '@/ui/overlays/tooltip';
import { Check, Link2, Play } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

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
  const title = s.variation || s.journey || s.email;
  const place = [
    s.browser && s.os
      ? t('{{browser}} on {{os}}', { browser: s.browser, os: s.os })
      : s.browser || s.os,
    s.loc,
  ]
    .filter(Boolean)
    .join(', ');
  return (
    <div
      role="button"
      tabIndex={0}
      className="m-scard"
      onClick={onClick}
      onKeyDown={(e) => {
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
        {s.plan ? <Chip tone="neutral">{s.plan}</Chip> : null}
      </span>
      <span className="m-scard__meta">
        <span className="m-truncate">{place}</span>
        {s.date && <span className="m-scard__date">{s.date}</span>}
      </span>
    </div>
  );
}
