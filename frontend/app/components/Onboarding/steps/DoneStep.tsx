import { Button } from '@/ui/actions/button';
import { ListeningMark } from '@/ui/brand/ListeningMark';
import { ArrowRight } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';

import type { Invite } from './InviteStep';

export type StepKey = 'install' | 'identify' | 'invite';
export type StepState = 'done' | 'skipped' | 'ahead';

const POLL_MS = 15000;

/** The end: what is now true, while the first session is awaited. */
function DoneStep({
  projectName,
  siteId,
  visited,
  metadataKeys,
  invited,
  onLeave,
  onIntegrations,
  onNewProject,
}: {
  projectName: string;
  siteId: string;
  visited: Record<StepKey, StepState>;
  metadataKeys: string[];
  invited: Invite[];
  onLeave: () => void;
  onIntegrations: () => void;
  onNewProject: () => void;
}) {
  const { t } = useTranslation();
  const { projectsStore } = useStore();
  const recorded = !!projectsStore.list.find((p) => p.id === siteId)?.recorded;
  const installed = visited.install === 'done';
  const listening = installed && !recorded;
  const openedListening = React.useRef(listening).current;

  React.useEffect(() => {
    if (!listening) return undefined;
    const id = setInterval(() => {
      if (!document.hidden) void projectsStore.refreshList();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [listening]);

  const lines: { key: StepKey; done: boolean; live?: boolean; text: string }[] =
    [
      recorded
        ? {
            key: 'install',
            done: true,
            text: t('Tracker live. First session is in.'),
          }
        : installed
          ? {
              key: 'install',
              done: false,
              live: true,
              text: t('Tracker installed. Listening for the first session…'),
            }
          : {
              key: 'install',
              done: false,
              text: t('Tracker not installed yet'),
            },
      visited.identify === 'done'
        ? {
            key: 'identify',
            done: true,
            text: metadataKeys.length
              ? t('Every session knows who, plus {{keys}}', {
                  keys: metadataKeys.join(', '),
                })
              : t('Every session knows who'),
          }
        : {
            key: 'identify',
            done: false,
            text: t('Sessions stay anonymous for now'),
          },
      invited.length
        ? {
            key: 'invite',
            done: true,
            text:
              invited.length === 1
                ? t('Invitation sent to {{who}}', {
                    who: invited[0].name.trim() || invited[0].email,
                  })
                : t('Invitations sent to {{who}} and {{n}} more', {
                    who: invited[0].name.trim() || invited[0].email,
                    n: invited.length - 1,
                  }),
          }
        : { key: 'invite', done: false, text: t('Just you, for now') },
    ];
  const allDone = lines.every((l) => l.done || l.live);

  return (
    <div className="m-ob__done">
      <span className="m-ob__seal" aria-hidden="true">
        <svg viewBox="0 0 72 72" className="m-ob__seal-svg">
          <circle cx="36" cy="36" r="33" className="m-ob__seal-aura" />
          <circle cx="36" cy="36" r="33" className="m-ob__seal-halo" />
          <circle
            cx="36"
            cy="36"
            r="33"
            className="m-ob__seal-glow"
            pathLength={100}
          />
          <circle cx="36" cy="36" r="33" className="m-ob__seal-disc" />
          <circle
            cx="36"
            cy="36"
            r="33"
            className="m-ob__seal-ring"
            pathLength={100}
          />
          <path
            d="M23 37l9 9 18-20"
            className="m-ob__seal-check"
            pathLength={100}
          />
        </svg>
      </span>
      <div className="m-ob__done-words">
        <h1 className="m-ob__title m-ob__done-title" id="m-ob-title">
          {allDone ? t('All set.') : t('Good to go.')}
        </h1>
        <p className="m-ob__done-project">{projectName}</p>
      </div>

      <ul className="m-ob__summary">
        {lines.map((l, i) => (
          <li
            key={l.key}
            className={`m-ob__summary-row${l.done ? ' is-done' : ''}${l.live ? ' is-live' : ''}`}
            style={{ '--i': i } as React.CSSProperties}
          >
            <span className="m-ob__summary-mark" aria-hidden={!l.live}>
              {l.live ? (
                <ListeningMark
                  label={t('Listening for the first session')}
                  size={22}
                />
              ) : l.done ? (
                <svg
                  viewBox="0 0 16 16"
                  className="m-ob__tick"
                  style={{
                    animationDelay: openedListening
                      ? '0ms'
                      : `${900 + i * 140}ms`,
                  }}
                >
                  <path d="M3.5 8.5l3 3 6-7" pathLength={100} />
                </svg>
              ) : (
                <span className="m-ob__dash" />
              )}
            </span>
            <span className="m-ob__summary-text">{l.text}</span>
          </li>
        ))}
      </ul>

      <div className="m-ob__done-actions">
        <Button
          variant="primary"
          size="md"
          onClick={onLeave}
          className="m-ob__next"
        >
          {t('Watch sessions')}
          <ArrowRight size={14} />
        </Button>
        <Button variant="subtle" size="md" onClick={onIntegrations}>
          {t('Connect integrations')}
        </Button>
        <Button variant="subtle" size="md" onClick={onNewProject}>
          {t('Add another project')}
        </Button>
      </div>
    </div>
  );
}

export default observer(DoneStep);
