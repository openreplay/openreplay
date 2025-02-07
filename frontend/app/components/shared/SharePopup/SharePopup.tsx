import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import { Icon, Loader } from 'UI';
import IntegrateSlackButton from '../IntegrateSlackButton/IntegrateSlackButton';
import SessionCopyLink from './SessionCopyLink';
import { Button, Divider, Form, Input, Segmented, Select, Space } from 'antd';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';

interface Channel {
  webhookId: string;
  name: string;
}

interface Props {
  showCopyLink?: boolean;
  hideModal: () => void;
  time: number;
}

const ShareModalComp: React.FC<Props> = ({ showCopyLink, hideModal, time }) => {
  const { integrationsStore, sessionStore } = useStore();
  const sessionId = sessionStore.current.sessionId;
  const slackChannels: Channel[] = integrationsStore.slack.list || [];
  const msTeamsChannels: Channel[] = integrationsStore.msteams.list || [];
  const slackLoaded = integrationsStore.slack.loaded;
  const msTeamsLoaded = integrationsStore.msteams.loaded;
  const fetchSlack = integrationsStore.slack.fetchIntegrations;
  const fetchTeams = integrationsStore.msteams.fetchIntegrations;
  const sendSlackMsg = integrationsStore.slack.sendMessage;
  const sendMsTeamsMsg = integrationsStore.msteams.sendMessage;

  const [shareTo, setShareTo] = useState<'slack' | 'teams'>('slack');
  const [comment, setComment] = useState('');
  const [channelId, setChannelId] = useState<string | undefined>(slackChannels[0]?.webhookId);
  const [teamsChannel, setTeamsChannel] = useState<string | undefined>(msTeamsChannels[0]?.webhookId);
  const [loadingSlack, setLoadingSlack] = useState(false);
  const [loadingTeams, setLoadingTeams] = useState(false);

  useEffect(() => {
    if (slackChannels.length === 0 && !slackLoaded) void fetchSlack();
  }, [slackChannels, slackLoaded, fetchSlack]);

  useEffect(() => {
    if (msTeamsChannels.length === 0 && !msTeamsLoaded) void fetchTeams();
  }, [msTeamsChannels, msTeamsLoaded, fetchTeams]);

  useEffect(() => {
    if (slackChannels.length && !channelId) {
      setChannelId(slackChannels[0].webhookId);
    }
  }, [slackChannels, channelId]);

  useEffect(() => {
    if (msTeamsChannels.length && !teamsChannel) {
      setTeamsChannel(msTeamsChannels[0].webhookId);
    }
  }, [msTeamsChannels, teamsChannel]);

  const editMessage = (e: React.ChangeEvent<HTMLTextAreaElement>) => setComment(e.target.value);

  const shareToSlack = async () => {
    if (!channelId) return;
    setLoadingSlack(true);
    try {
      await sendSlackMsg({
        integrationId: channelId,
        entity: 'sessions',
        entityId: sessionId,
        data: { comment }
      });
      toast.success('Sent to Slack.');
    } catch {
      toast.error('Failed to send to Slack.');
    } finally {
      setLoadingSlack(false);
    }
  };

  const shareToMSTeams = async () => {
    if (!teamsChannel) return;
    setLoadingTeams(true);
    try {
      await sendMsTeamsMsg({
        integrationId: teamsChannel,
        entity: 'sessions',
        entityId: sessionId,
        data: { comment }
      });
      toast.success('Sent to MS Teams.');
    } catch {
      toast.error('Failed to send to MS Teams.');
    } finally {
      setLoadingTeams(false);
    }
  };

  const changeSlackChannel = (value: string) => setChannelId(value);
  const changeTeamsChannel = (value: string) => setTeamsChannel(value);

  const slackOptions = useMemo(
    () =>
      slackChannels.map(({ webhookId, name }) => ({
        value: webhookId,
        label: name
      })),
    [slackChannels]
  );

  const msTeamsOptions = useMemo(
    () =>
      msTeamsChannels.map(({ webhookId, name }) => ({
        value: webhookId,
        label: name
      })),
    [msTeamsChannels]
  );

  const sendMsg = async () => {
    shareTo === 'slack' ? await shareToSlack() : await shareToMSTeams();
    hideModal();
  };

  const hasBoth = slackOptions.length > 0 && msTeamsOptions.length > 0;
  const hasNothing = slackOptions.length === 0 && msTeamsOptions.length === 0;
  const isLoading = loadingSlack || loadingTeams;

  const handleSegmentChange = (value: string) => {
    const newShareTo = value as 'slack' | 'teams';
    setShareTo(newShareTo);
    if (newShareTo === 'slack' && slackOptions.length > 0) {
      setChannelId(slackOptions[0].value);
    } else if (newShareTo === 'teams' && msTeamsOptions.length > 0) {
      setTeamsChannel(msTeamsOptions[0].value);
    }
  };

  return (
    <div>
      {isLoading ? (
        <Loader loading />
      ) : (
        <>
          {!hasNothing ? (
            <>
              <Form layout="vertical">
                <Form.Item label="Share via">
                  {hasBoth ? (
                    <Segmented
                      options={[
                        {
                          label: (
                            <div className="flex items-center gap-2">
                              <Icon name="integrations/slack-bw" size={16} />
                              <div>Slack</div>
                            </div>
                          ),
                          value: 'slack'
                        },
                        {
                          label: (
                            <div className="flex items-center gap-2">
                              <Icon name="integrations/teams-white" size={16} />
                              <div>MS Teams</div>
                            </div>
                          ),
                          value: 'teams'
                        }
                      ]}
                      onChange={handleSegmentChange}
                      value={shareTo}
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <Icon
                        name={slackOptions.length > 0 ? 'integrations/slack-bw' : 'integrations/teams-white'}
                        size={16}
                      />
                      <div>{slackOptions.length > 0 ? 'Slack' : 'MS Teams'}</div>
                    </div>
                  )}
                </Form.Item>

                <Form.Item label="Select a channel or individual">
                  {shareTo === 'slack' ? (
                    <Select value={channelId} onChange={changeSlackChannel} className="col-span-4">
                      {slackOptions.map(({ value, label }) => (
                        <Select.Option key={value} value={value}>
                          {label}
                        </Select.Option>
                      ))}
                    </Select>
                  ) : (
                    <Select value={teamsChannel} onChange={changeTeamsChannel} className="col-span-4">
                      {msTeamsOptions.map(({ value, label }) => (
                        <Select.Option key={value} value={value}>
                          {label}
                        </Select.Option>
                      ))}
                    </Select>
                  )}
                </Form.Item>

                <Form.Item label="Message">
                  <Input.TextArea
                    name="message"
                    id="message"
                    cols={30}
                    rows={4}
                    onChange={editMessage}
                    value={comment}
                    placeholder="Add Message (Optional)"
                    className="p-4 text-figmaColors-text-primary text-base bg-white border rounded border-gray-light"
                  />
                </Form.Item>

                <Form.Item>
                  <Space>
                    <Button type="primary" onClick={sendMsg}>
                      Send
                    </Button>
                    <Button type="primary" ghost onClick={hideModal}>
                      Cancel
                    </Button>
                  </Space>
                </Form.Item>
              </Form>

              <Divider />

              <SessionCopyLink time={time} />
            </>
          ) : (
            <>
              <IntegrateSlackButton />
              {showCopyLink && (
                <>
                  <div className="border-t -mx-2" />
                  <SessionCopyLink time={time} />
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default observer(ShareModalComp);
