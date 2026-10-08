import { Button } from '@/ui/actions/button';
import { Icon } from '@/ui/icons/Icon';
import { Input } from '@/ui/inputs/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/inputs/select';
import { Switch } from '@/ui/inputs/switch';
import { Textarea } from '@/ui/inputs/textarea';
import { Modal } from '@/ui/overlays/modal';
import { useToast } from '@/ui/overlays/toast';
import copy from 'copy-to-clipboard';
import { Check, Link2, Send } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
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

export function sessionUrl(time?: number) {
  const hasTime = Boolean(time) && !Number.isNaN(time);
  const base = window.location.origin + window.location.pathname;
  return hasTime ? `${base}?jumpto=${Math.round(time!)}` : base;
}

const ShareContent = observer(
  ({ time, onDone }: { time?: number; onDone: () => void }) => {
    const { t } = useTranslation();
    const toast = useToast();
    const navigate = useNavigate();
    const { integrationsStore, sessionStore } = useStore();
    const { sessionId } = sessionStore.current;
    const { slack, msteams } = integrationsStore;
    const slackChannels: Channel[] = slack.list || [];
    const teamsChannels: Channel[] = msteams.list || [];

    const [atTime, setAtTime] = useState(Boolean(time));
    const [copied, setCopied] = useState(false);
    const [target, setTarget] = useState<Target>('slack');
    const [channel, setChannel] = useState<string | undefined>();
    const [comment, setComment] = useState('');
    const [sending, setSending] = useState(false);

    useEffect(() => {
      if (!slack.loaded) void slack.fetchIntegrations();
      if (!msteams.loaded) void msteams.fetchIntegrations();
    }, []);

    const channels = target === 'slack' ? slackChannels : teamsChannels;
    const targets: Target[] = [
      ...(slackChannels.length ? (['slack'] as const) : []),
      ...(teamsChannels.length ? (['teams'] as const) : []),
    ];
    useEffect(() => {
      if (targets.length && !targets.includes(target)) setTarget(targets[0]);
    }, [targets.join()]);
    useEffect(() => {
      setChannel(channels[0] ? String(channels[0].webhookId) : undefined);
    }, [target, channels.length]);

    const url = sessionUrl(atTime ? time : undefined);
    const copyLink = () => {
      copy(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    };

    const send = async () => {
      if (!channel) return;
      setSending(true);
      const name = target === 'slack' ? 'Slack' : 'MS Teams';
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

    return (
      <div className="m-share">
        <section className="m-share__section">
          <div className="m-share__link">
            <Input
              readOnly
              value={url}
              aria-label={t('Session link')}
              onFocus={(e) => e.currentTarget.select()}
              className="m-mono"
            />
            <Button variant="primary" onClick={copyLink}>
              {copied ? <Check size={13} /> : <Link2 size={13} />}
              {copied ? t('Copied') : t('Copy link')}
            </Button>
          </div>
          {time ? (
            <label className="m-share__row">
              <Switch checked={atTime} onCheckedChange={setAtTime} />
              <span>{t('Start at {{time}}', { time: formatClock(time) })}</span>
            </label>
          ) : null}
        </section>

        <section className="m-share__section">
          <h3 className="m-share__h">{t('Send to a channel')}</h3>
          {targets.length === 0 ? (
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
              <div className="m-share__pick">
                {targets.length > 1 ? (
                  <Select
                    value={target}
                    onValueChange={(v) => setTarget(v as Target)}
                  >
                    <SelectTrigger className="m-share__target">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="slack">{t('Slack')}</SelectItem>
                      <SelectItem value="teams">{t('MS Teams')}</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="m-share__target-name">
                    <Icon
                      name={
                        target === 'slack'
                          ? 'integrations/slack-bw'
                          : 'integrations/teams-white'
                      }
                      size={14}
                    />
                    {target === 'slack' ? t('Slack') : t('MS Teams')}
                  </span>
                )}
                <Select value={channel ?? ''} onValueChange={setChannel}>
                  <SelectTrigger
                    className="flex-1"
                    aria-label={t('Channel or person')}
                  >
                    <SelectValue placeholder={t('Choose a channel')} />
                  </SelectTrigger>
                  <SelectContent>
                    {channels.map((c) => (
                      <SelectItem key={c.webhookId} value={String(c.webhookId)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t('Add a message (optional)')}
              />
              <div className="m-share__actions">
                <Button
                  variant="secondary"
                  onClick={send}
                  disabled={!channel || sending}
                >
                  <Send size={13} />
                  {sending ? t('Sending…') : t('Send')}
                </Button>
              </div>
            </>
          )}
        </section>
      </div>
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
  const { t } = useTranslation();
  return (
    <Modal
      title={t('Share session')}
      open={open}
      onCancel={onClose}
      footer={null}
      width={480}
    >
      {open ? <ShareContent time={time} onDone={onClose} /> : null}
    </Modal>
  );
}

interface Props {
  showCopyLink?: boolean;
  hideModal: () => void;
  time: number;
}

/** Content only, for hosts that bring their own drawer. */
function ShareModalComp({ hideModal, time }: Props) {
  return <ShareContent time={time} onDone={hideModal} />;
}

export default ShareModalComp;
