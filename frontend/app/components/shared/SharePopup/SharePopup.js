import React from 'react';
import { connect } from 'react-redux';
import { toast } from 'react-toastify';
import { Icon, Button, Popover } from 'UI';
import styles from './sharePopup.module.css';
import IntegrateSlackButton from '../IntegrateSlackButton/IntegrateSlackButton';
import SessionCopyLink from './SessionCopyLink';
import Select from 'Shared/Select';
import cn from 'classnames';
import { fetchList as fetchSlack, sendSlackMsg } from 'Duck/integrations/slack';
import { fetchList as fetchTeams, sendMsTeamsMsg } from 'Duck/integrations/teams';

@connect(
  (state) => ({
    sessionId: state.getIn(['sessions', 'current']).sessionId,
    channels: state.getIn(['slack', 'list']),
    msTeamsChannels: state.getIn(['teams', 'list']),
    tenantId: state.getIn(['user', 'account', 'tenantId']),
  }),
  { fetchSlack, fetchTeams, sendSlackMsg, sendMsTeamsMsg }
)
export default class SharePopup extends React.PureComponent {
  state = {
    comment: '',
    isOpen: false,
    channelId: this.props.channels.getIn([0, 'webhookId']),
    teamsChannel: this.props.msTeamsChannels.getIn([0, 'webhookId']),
    loading: false,
  };

  componentDidMount() {
    if (this.props.channels.size === 0) {
      this.props.fetchSlack();
    }
    if (this.props.msTeamsChannels.size === 0) {
      this.props.fetchTeams();
    }
  }

  editMessage = (e) => this.setState({ comment: e.target.value });
  shareToSlack = () => {
    this.setState({ loading: true }, () => {
      this.props
        .sendSlackMsg({
          integrationId: this.state.channelId,
          entity: 'sessions',
          entityId: this.props.sessionId,
          data: { comment: this.state.comment },
        })
        .then(() => this.handleSuccess('Slack'));
    });
  };

  shareToMSTeams = () => {
    this.setState({ loading: true }, () => {
      this.props
        .sendMsTeamsMsg({
          integrationId: this.state.teamsChannel,
          entity: 'sessions',
          entityId: this.props.sessionId,
          data: { comment: this.state.comment },
        })
        .then(() => this.handleSuccess('MS Teams'));
    });
  };

  handleOpen = () => {
    setTimeout(function () {
      document.getElementById('message').focus();
    }, 100);
  };

  handleClose = () => {
    this.setState({ comment: '' });
  };

  handleSuccess = (endpoint) => {
    this.setState({ isOpen: false, comment: '', loading: false });
    toast.success(`Sent to ${endpoint}.`);
  };

  changeSlackChannel = ({ value }) => this.setState({ channelId: value.value });

  changeTeamsChannel = ({ value }) => this.setState({ teamsChannel: value.value });

  onClickHandler = () => {
    this.setState({ isOpen: true });
  };

  render() {
    const { trigger, channels, msTeamsChannels, showCopyLink = false } = this.props;
    const { comment, channelId, teamsChannel, loading } = this.state;

    // const slackOptions = channels
    //   .map(({ webhookId, name }) => ({ value: webhookId, label: name }))
    //   .toJS();

    // const msTeamsOptions = msTeamsChannels
    //   .map(({ webhookId, name }) => ({ value: webhookId, label: name }))
    //   .toJS();

    const slackOptions = [], msTeamsOptions = [];

    return (
      <Popover
        render={() => (
          <div className={styles.wrapper}>
            <div className={styles.header}>
              <div className={cn(styles.title, 'text-lg')}>
                Share this session link to Slack/MS Teams
              </div>
            </div>
            {slackOptions.length > 0 || msTeamsOptions.length > 0 ? (
              <div>
                <div className={styles.body}>
                  <textarea
                    name="message"
                    id="message"
                    cols="30"
                    rows="4"
                    resize="none"
                    onChange={this.editMessage}
                    value={comment}
                    placeholder="Add Message (Optional)"
                    className="p-4 text-figmaColors-text-primary text-base"
                  />

                  {slackOptions.length > 0 && (
                    <>
                      <span>Share to slack</span>
                      <div className="flex items-center justify-between mb-2">
                        <Select
                          options={slackOptions}
                          defaultValue={channelId}
                          onChange={this.changeSlackChannel}
                          className="mr-4"
                        />
                        {this.state.channelId && (
                          <Button onClick={this.shareToSlack} variant="primary">
                            <div className="flex items-center">
                              <Icon name="integrations/slack-bw" color="white" size="18" marginRight="10" />
                              {loading ? 'Sending...' : 'Send'}
                            </div>
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                  {msTeamsOptions.length > 0 && (
                    <>
                      <span>Share to MS Teams</span>
                      <div className="flex items-center justify-between">
                        <Select
                          options={msTeamsOptions}
                          defaultValue={teamsChannel}
                          onChange={this.changeTeamsChannel}
                          className="mr-4"
                        />
                        {this.state.teamsChannel && (
                          <Button onClick={this.shareToMSTeams} variant="primary">
                            <div className="flex items-center">
                              <Icon
                                name="integrations/teams-white"
                                color="white"
                                size="18"
                                marginRight="10"
                              />
                              {loading ? 'Sending...' : 'Send'}
                            </div>
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </div>
                <div className={styles.footer}>
                  <SessionCopyLink />
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
                    <SessionCopyLink />
                  </div>
                  </>
                )}
              </>
            )}
          </div>
        )}
      >
        {trigger}
      </Popover>
    );
  }
}
