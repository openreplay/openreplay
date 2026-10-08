import { Chip } from '@/ui/data/Chip';
import { Play } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import 'Components/Session/ReplayScreen/journey-panel.css';
import 'Components/Session/ReplayScreen/side-panel.css';
import { PlayerContext } from 'Components/Session/playerContext';

import { type IssueSessionCard } from '../shared';

const fmtTime = (ms: number): string => {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

// memoized: the parent re-renders on every player tick
const Step = React.memo(function Step({
  name,
  ms,
  last,
  past,
  active,
  onJump,
}: {
  name: string;
  ms: number;
  last: boolean;
  past: boolean;
  active: boolean;
  onJump: (ms: number) => void;
}) {
  const { t } = useTranslation();
  return (
    <li className="m-jrn__item">
      <button
        type="button"
        className={`m-jrn__step${active ? ' is-active' : ''}${past ? ' is-past' : ''}`}
        onClick={() => onJump(ms)}
        aria-current={active ? 'step' : undefined}
        title={t('Jump to {{time}}', { time: fmtTime(ms) })}
      >
        <span className="m-spanel__time m-jrn__at m-mono">{fmtTime(ms)}</span>
        <span className="m-jrn__thread" aria-hidden="true">
          <span
            className={`m-jrn__wire m-jrn__wire--lead${past ? ' is-past' : ''}`}
          />
          <span className="m-jrn__node">
            <Play size={10} strokeWidth={2} aria-hidden="true" />
          </span>
          {!last && (
            <span
              className={`m-jrn__wire m-jrn__wire--tail${past ? ' is-past' : ''}`}
            />
          )}
        </span>
        <span className="m-jrn__body">
          <span className="m-jrn__row">
            <span className="m-jrn__label">{name}</span>
          </span>
        </span>
      </button>
    </li>
  );
});

/** The session's journey; each step seeks the player, the current one is lit. */
const JourneyView = observer(({ card }: { card?: IssueSessionCard }) => {
  const { t } = useTranslation();
  const { player, store } = React.useContext(PlayerContext);
  const nowMs: number = (store?.get?.() as any)?.time ?? 0;
  const jump = React.useCallback((ms: number) => player?.jump(ms), [player]);
  const steps = card?.journeySteps ?? [];
  const journey = card?.journey?.trim();
  const tags = card?.tags ?? [];

  if (steps.length === 0 && !journey && tags.length === 0)
    return (
      <p className="px-6 py-5 text-xs text-content-muted">
        {t('No journey recorded for this session.')}
      </p>
    );

  let current = -1;
  steps.forEach((s, i) => {
    if (nowMs >= s.relativeTimestamp - 500) current = i;
  });

  return (
    <div className="flex flex-col gap-4">
      {steps.length > 0 ? (
        <ol className="m-jrn__list">
          {steps.map((s, i) => (
            <Step
              key={`${s.name}-${i}`}
              name={s.name}
              ms={s.relativeTimestamp}
              last={i === steps.length - 1}
              past={i <= current}
              active={i === current}
              onJump={jump}
            />
          ))}
        </ol>
      ) : journey ? (
        <div className="m-jrn__answers">
          <section className="m-jrn__answer">
            <h3>{t('Journey')}</h3>
            <p>{journey}</p>
          </section>
        </div>
      ) : null}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 px-6">
          {tags.map((tag) => (
            <Chip key={tag} kind="tag">
              {tag}
            </Chip>
          ))}
        </div>
      )}
    </div>
  );
});

export default JourneyView;
