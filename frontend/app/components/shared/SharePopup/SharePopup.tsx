import { useModal } from 'Components/Modal';
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Icon, Loader } from 'UI';
import styles from './sharePopup.module.css';
import IntegrateSlackButton from '../IntegrateSlackButton/IntegrateSlackButton';
import SessionCopyLink from './SessionCopyLink';
import Select from 'Shared/Select';
import { Button, Segmented } from 'antd';
import { PlayerContext } from 'App/components/Session/playerContext';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';

interface Msg {
  integrationId: string;
  entity: 'sessions';
  entityId: string;
  data: { comment: string };
}

const SharePopup = ({
  trigger,
  showCopyLink = false,
}: {
  trigger: React.ReactNode;
  showCopyLink?: boolean;
}) => {
  const { store } = React.useContext(PlayerContext);
  const { showModal, hideModal } = useModal();
  const openModal = () => {
    showModal(
      <ShareModal
        hideModal={hideModal}
        showCopyLink={showCopyLink}
        time={store?.get().time}
      />,
      { right: true, width: 300 }
    );
  };

  return (
    <div className={'w-full h-full'} onClick={openModal}>
      {trigger}
    </div>
  );
};


interface Props {
  showCopyLink?: boolean;
  hideModal: () => void;
  time: number;
}

function ShareModalComp({
  showCopyLink,
  hideModal,
  time,
}: Props) {
  const { integrationsStore, sessionStore, userStore } = useStore();
  const sessionId = sessionStore.current.sessionId
  const channels = integrationsStore.slack.list;
  const slackLoaded = integrationsStore.slack.loaded;
  const msTeamsChannels = integrationsStore.msteams.list;
  const msTeamsLoaded = integrationsStore.msteams.loaded;
  const fetchSlack = integrationsStore.slack.fetchIntegrations;
  const fetchTeams = integrationsStore.msteams.fetchIntegrations;
  const sendSlackMsg = integrationsStore.slack.sendMessage;
  const sendMsTeamsMsg = integrationsStore.msteams.sendMessage;

  const [shareTo, setShareTo] = useState('slack');
  const [comment, setComment] = useState('');
  // @ts-ignore
  const [channelId, setChannelId] = useState(channels[0]?.webhookId);
  // @ts-ignore
  const [teamsChannel, setTeamsChannel] = useState(msTeamsChannels[0]?.webhookId);
  const [loadingSlack, setLoadingSlack] = useState(false);
  const [loadingTeams, setLoadingTeams] = useState(false);

  const isLoading = loadingSlack || loadingTeams;

  useEffect(() => {
    // @ts-ignore
    if (channels.size === 0 && !slackLoaded) {
      fetchSlack();
    }
    // @ts-ignore
    if (msTeamsChannels.size === 0 && !msTeamsLoaded) {
      fetchTeams();
    }
  }, [channels, slackLoaded, msTeamsChannels, msTeamsLoaded, fetchSlack, fetchTeams]);

  const editMessage = (e: React.ChangeEvent<HTMLTextAreaElement>) => setComment(e.target.value);
  const shareToSlack = () => {
    setLoadingSlack(true);
    void sendSlackMsg({
      integrationId: channelId,
      entity: 'sessions',
      entityId: sessionId,
      data: { comment },
    }).then(() => handleSuccess('Slack'));
  };

  const shareToMSTeams = () => {
    setLoadingTeams(true);
    sendMsTeamsMsg({
      integrationId: teamsChannel,
      entity: 'sessions',
      entityId: sessionId,
      data: { comment },
    }).then(() => handleSuccess('MS Teams'));
  };

  const handleSuccess = (endpoint: string) => {
    if (endpoint === 'Slack') {
      setLoadingSlack(false);
    } else {
      setLoadingTeams(false);
    }
    // @ts-ignore
    toast.success(`Sent to ${endpoint}.`);
  };

  const changeSlackChannel = (value: any) => setChannelId(value.value);
  const changeTeamsChannel = (value: any) => setTeamsChannel(value.value);

  const slackOptions = channels
    .map(({ webhookId, name }) => ({
      value: webhookId,
      label: name,
    }))

  const msTeamsOptions = msTeamsChannels
    .map(({ webhookId, name }) => ({
      value: webhookId,
      label: name,
    }))

  const sendMsg = () => {
    if (shareTo === 'slack') {
      shareToSlack();
    } else {
      shareToMSTeams();
    }
    hideModal();
  }
  const hasBoth = slackOptions.length > 0 && msTeamsOptions.length > 0;
  const hasNothing = slackOptions.length === 0 && msTeamsOptions.length === 0;
  return (
    <div className={styles.wrapper}>
      {isLoading ? (
        <Loader loading />
      ) : (
        <>
          <div className="text-xl mr-4 font-semibold mb-4 flex items-center gap-2">
            <Icon name={'share-alt'} size={16} />
            <div>Share Session</div>
          </div>
          {!hasNothing ? (
            <div>
              <div className={'flex flex-col gap-4'}>
                <div>
                  <div className={'font-medium flex items-center'}>
                    Share via
                  </div>
                  {hasBoth ? (
                    <Segmented
                      options={[
                        {
                          label: <div className={'flex items-center gap-2'}>
                            <Icon name="integrations/slack-bw" size={16} />
                            <div>Slack</div>
                          </div>,
                          value: 'slack',
                        },
                        {
                          label: <div className={'flex items-center gap-2'}>
                            <Icon name="integrations/teams-white" size={16}  />
                            <div>MS Teams</div>
                          </div>,
                          value: 'teams',
                        },
                      ]}
                      onChange={(value) => setShareTo(value as 'slack' | 'teams')}
                    />
                  ) : (
                    <div className={'flex items-center gap-2'}>
                      <Icon
                        name={
                          slackOptions.length > 0
                            ? 'integrations/slack-bw'
                            : 'integrations/teams-white'
                        }
                        size={16}
                      />
                      <div>{slackOptions.length > 0 ? 'Slack' : 'MS Teams'}</div>
                    </div>
                  )}
                </div>

                <div>
                  <div className={'font-medium'}>Select a channel or individual</div>
                  {shareTo === 'slack' ? (
                    <Select
                      options={slackOptions}
                      defaultValue={channelId}
                      onChange={changeSlackChannel}
                      className="col-span-4"
                    />
                  ) : (
                    <Select
                      options={msTeamsOptions}
                      defaultValue={teamsChannel}
                      onChange={changeTeamsChannel}
                      className="col-span-4"
                    />
                  )}
                </div>

                <div>
                  <div className={'font-medium'}>Message</div>
                  <textarea
                    name="message"
                    id="message"
                    cols={30}
                    rows={4}
                    onChange={editMessage}
                    value={comment}
                    placeholder="Add Message (Optional)"
                    className="p-4 text-figmaColors-text-primary text-base bg-white border rounded border-gray-light"
                  />
                </div>
              </div>
              <div className={'mt-4'}>
                <SessionCopyLink time={time} />
                <div className={'flex items-center gap-2 pt-8 mt-4 border-t'}>
                  <Button type={'primary'} onClick={sendMsg}>Send</Button>
                  <Button type={'primary'} ghost onClick={hideModal}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className={styles.body}>
                <IntegrateSlackButton />
              </div>
              {showCopyLink && (
                <>
                  <div className="border-t -mx-2" />
                  <div>
                    <SessionCopyLink time={time} />
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

const ShareModal = observer(ShareModalComp);

export default observer(SharePopup);
