import { Button } from '@/ui/actions/button';
import { CodeBlock } from '@/ui/data/CodeBlock';
import { Field } from '@/ui/inputs/Field';
import { Checkbox } from '@/ui/inputs/checkbox';
import { SimpleSelect } from '@/ui/inputs/select';
import { Textarea } from '@/ui/inputs/textarea';
import { Segmented } from '@/ui/inputs/toggle-group';
import { Modal } from '@/ui/overlays/modal';
import { useToast } from '@/ui/overlays/toast';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { formatClock } from 'App/player-ui/clock';
import { CLIENT_TABS, client as clientRoute } from 'App/routes';
import { useNavigate } from 'App/routing';
import { signalService } from 'App/services';

import './share-dialog.css';

interface Channel {
  webhookId: string;
  name: string;
}

type Target = 'slack' | 'teams';

const TARGET_NAME: Record<Target, string> = {
  slack: 'Slack',
  teams: 'MS Teams',
};

export function sessionUrl(time?: number) {
  const hasTime = Boolean(time) && !Number.isNaN(time);
  const base = window.location.origin + window.location.pathname;
  return hasTime ? `${base}?jumpto=${Math.round(time!)}` : base;
}

/** The link, its start, and where to send it: one dialog's state. */
function useShare(time: number | undefined, onDone: () => void) {
  const { t } = useTranslation();
  const toast = useToast();
  const { integrationsStore, sessionStore } = useStore();
  const { sessionId } = sessionStore.current;
  const { slack, msteams } = integrationsStore;
  const slackChannels: Channel[] = slack.list || [];
  const teamsChannels: Channel[] = msteams.list || [];

  const [atTime, setAtTime] = useState(Boolean(time));
  const [target, setTarget] = useState<Target>('slack');
  const [channel, setChannel] = useState<string | undefined>();
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!slack.loaded) void slack.fetchIntegrations();
    if (!msteams.loaded) void msteams.fetchIntegrations();
  }, []);

  const channels = target === 'slack' ? slackChannels : teamsChannels;
  const connected: Record<Target, boolean> = {
    slack: slackChannels.length > 0,
    teams: teamsChannels.length > 0,
  };
  const anyConnected = connected.slack || connected.teams;
  useEffect(() => {
    if (anyConnected && !connected[target])
      setTarget(connected.slack ? 'slack' : 'teams');
  }, [connected.slack, connected.teams]);
  useEffect(() => {
    setChannel(channels[0] ? String(channels[0].webhookId) : undefined);
  }, [target, channels.length]);

  const send = async () => {
    if (!channel) return;
    setSending(true);
    const name = TARGET_NAME[target];
    try {
      await (target === 'slack' ? slack : msteams).sendMessage({
        integrationId: channel,
        entity: 'sessions',
        entityId: sessionId,
        data: { comment },
      });
      toast.success(t('Sent to {{name}}.', { name }));
      signalService.send({ source: 'share', value: target }, sessionId);
      onDone();
    } catch {
      toast.error(t('Failed to send to {{name}}.', { name }));
    } finally {
      setSending(false);
    }
  };

  return {
    url: sessionUrl(atTime ? time : undefined),
    atTime,
    setAtTime,
    target,
    setTarget,
    connected,
    anyConnected,
    channels,
    channel,
    setChannel,
    comment,
    setComment,
    sending,
    send,
    sendLabel: sending
      ? t('Sending…')
      : t('Send to {{name}}', { name: TARGET_NAME[target] }),
  };
}

type ShareState = ReturnType<typeof useShare>;

function ShareBody({
  s,
  time,
  onDone,
}: {
  s: ShareState;
  time?: number;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  const id = useId();
  return (
    <div className="m-share">
      <section className="m-share__part">
        <CodeBlock
          inline
          plain
          code={s.url}
          copyLabel={t('Copy link')}
          onCopied={() => toast.success(t('Link copied'))}
        />
        {time ? (
          <label className="m-share__at" htmlFor={`${id}-at`}>
            <Checkbox
              id={`${id}-at`}
              checked={s.atTime}
              onCheckedChange={(v) => s.setAtTime(v === true)}
            />
            <span>
              {t('Start at')}{' '}
              <span className="m-mono">{formatClock(time)}</span>
            </span>
          </label>
        ) : null}
      </section>

      <section className="m-share__part">
        <h3 className="m-share__h">{t('Send to a channel')}</h3>
        {!s.anyConnected ? (
          <p className="m-share__empty">
            {t('Connect Slack or MS Teams to send sessions to a channel.')}{' '}
            <button
              type="button"
              className="m-share__link-btn"
              onClick={() => {
                onDone();
                navigate(clientRoute(CLIENT_TABS.INTEGRATIONS));
              }}
            >
              {t('Set up an integration')}
            </button>
          </p>
        ) : (
          <>
            <Segmented<Target>
              block
              ariaLabel={t('Send with')}
              value={s.target}
              onChange={s.setTarget}
              options={(['slack', 'teams'] as const).map((v) => ({
                value: v,
                label: TARGET_NAME[v],
                disabled: !s.connected[v],
                title: s.connected[v]
                  ? undefined
                  : t('{{name}} is not connected', { name: TARGET_NAME[v] }),
                icon: (
                  <img
                    src={`/assets/integrations/${v === 'slack' ? 'slack' : 'teams'}.svg`}
                    alt=""
                    className="m-share__brand"
                  />
                ),
              }))}
            />
            <Field label={t('Channel')}>
              {(fid) => (
                <SimpleSelect<string>
                  id={fid}
                  className="w-full"
                  value={s.channel}
                  onChange={s.setChannel}
                  placeholder={t('Choose a channel')}
                  options={s.channels.map((c) => ({
                    value: String(c.webhookId),
                    label: c.name,
                  }))}
                />
              )}
            </Field>
            <Field label={t('Message')} aside={t('Optional')}>
              {(fid) => (
                <Textarea
                  id={fid}
                  rows={3}
                  value={s.comment}
                  onChange={(e) => s.setComment(e.target.value)}
                  placeholder={t(
                    'e.g. The checkout button stops responding after a retry',
                  )}
                />
              )}
            </Field>
          </>
        )}
      </section>
    </div>
  );
}

const ShareModal = observer(
  ({ time, onClose }: { time?: number; onClose: () => void }) => {
    const { t } = useTranslation();
    const s = useShare(time, onClose);
    return (
      <Modal
        title={t('Share session')}
        open
        onCancel={onClose}
        width={480}
        onOk={s.anyConnected ? () => void s.send() : undefined}
        okText={s.sendLabel}
        okDisabled={!s.channel || s.sending}
      >
        <ShareBody s={s} time={time} onDone={onClose} />
      </Modal>
    );
  },
);

/** The share dialog: the session link, and a channel to send it to. */
export function ShareDialog({
  open,
  onClose,
  time,
}: {
  open: boolean;
  onClose: () => void;
  time?: number;
}) {
  return open ? <ShareModal time={time} onClose={onClose} /> : null;
}

interface Props {
  showCopyLink?: boolean;
  hideModal: () => void;
  time: number;
}

/** Content only, for hosts that bring their own drawer. */
const ShareModalComp = observer(({ hideModal, time }: Props) => {
  const s = useShare(time, hideModal);
  return (
    <>
      <ShareBody s={s} time={time} onDone={hideModal} />
      {s.anyConnected ? (
        <div className="m-share__actions">
          <Button
            variant="primary"
            onClick={() => void s.send()}
            disabled={!s.channel || s.sending}
          >
            {s.sendLabel}
          </Button>
        </div>
      ) : null}
    </>
  );
});

export default ShareModalComp;
