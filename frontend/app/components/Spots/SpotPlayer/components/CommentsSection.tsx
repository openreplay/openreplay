import { Input } from '@/ui/inputs/input';
import { useToast } from '@/ui/overlays/toast';
import { Tooltip } from '@/ui/overlays/tooltip';
import { SendHorizontal } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { resentOrDate } from 'App/date';
import { useStore } from 'App/mstore';
import { hashString } from 'App/types/session/session';
import { PanelBar } from 'Components/Session/ReplayScreen/PanelBar';

import { SessionAvatar } from 'Shared/SessionAvatar/SessionAvatar';

/** The thread on a spot, with the composer pinned to the panel's foot. */
function CommentsSection() {
  const { t } = useTranslation();
  const toast = useToast();
  const { spotStore, userStore } = useStore();
  const userEmail = userStore.account.name;
  const loggedIn = !!userEmail;
  const comments = spotStore.currentSpot?.comments ?? [];
  const [text, setText] = React.useState('');
  const [name, setName] = React.useState<string>(userEmail ?? '');

  const limited = loggedIn ? comments.length > 25 : comments.length > 5;
  const needsName = !loggedIn && name.trim().length === 0;
  const canSend = text.trim().length > 0 && !needsName && !limited;

  const send = async () => {
    if (!canSend) return;
    try {
      await spotStore.addComment(spotStore.currentSpot!.spotId, text, name);
      setText('');
    } catch {
      toast.error(t('Failed to add comment; Try again later'));
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PanelBar
        note={
          comments.length === 0
            ? t('No comments yet')
            : comments.length === 1
              ? t('1 comment')
              : t('{{count}} comments', { count: comments.length })
        }
      />
      <ul className="m-spanel__list m-rs__comments">
        {comments.map((c) => (
          <li key={c.createdAt} className="m-spanel__row m-rs__comment">
            <span className="m-spanel__cell">
              <SessionAvatar seed={hashString(c.user)} size={20} />
              <span className="m-spanel__body">
                <span className="m-spanel__line">
                  <span className="m-spanel__label m-rs__comment-author m-truncate">
                    {c.user}
                  </span>
                  <span className="m-spanel__tail">
                    {resentOrDate(new Date(c.createdAt).getTime())}
                  </span>
                </span>
                <p className="m-rs__comment-text">{c.text}</p>
              </span>
            </span>
          </li>
        ))}
      </ul>
      {!loggedIn ? (
        <div className="m-rs__composer">
          <Input
            value={name}
            placeholder={t('Add a name')}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
      ) : null}
      <div className="m-rs__composer">
        <Input
          value={text}
          maxLength={120}
          placeholder={t('Add a comment...')}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void send()}
        />
        <Tooltip
          title={
            limited
              ? loggedIn
                ? t('Limited to 25 Messages.')
                : t('Limited to 5 Messages. Join team to send more.')
              : t('Send')
          }
        >
          <span>
            <button
              type="button"
              className="m-rs__send"
              aria-label={t('Send comment')}
              disabled={!canSend}
              onClick={() => void send()}
            >
              <SendHorizontal size={14} aria-hidden="true" />
            </button>
          </span>
        </Tooltip>
      </div>
    </div>
  );
}

export default observer(CommentsSection);
