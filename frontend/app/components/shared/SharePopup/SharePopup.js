import React from 'react';
import { connect } from 'react-redux';
import { toast } from 'react-toastify';
import { Form, Button, Popover, Loader } from 'UI';
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
    slackLoaded: state.getIn(['slack', 'loaded']),
    msTeamsChannels: state.getIn(['teams', 'list']),
    msTeamsLoaded: state.getIn(['teams', 'loaded']),
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
    loadingSlack: false,
    loadingTeams: false,
  };

  componentDidUpdate() {
    if (this.state.isOpen) {
      if (this.props.channels.size === 0 && !this.props.slackLoaded) {
        this.props.fetchSlack();
      }
      if (this.props.msTeamsChannels.size === 0 && !this.props.msTeamsLoaded) {
        this.props.fetchTeams();
      }
    }
  }

  editMessage = (e) => this.setState({ comment: e.target.value });
  shareToSlack = () => {
    this.setState({ loadingSlack: true }, () => {
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
    this.setState({ loadingTeams: true }, () => {
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
    const obj = endpoint === 'Slack' ? { loadingSlack: false } : { loadingTeams: false };
    this.setState(obj);
    toast.success(`Sent to ${endpoint}.`);
  };

  changeSlackChannel = ({ value }) => this.setState({ channelId: value.value });

  changeTeamsChannel = ({ value }) => this.setState({ teamsChannel: value.value });

  onClickHandler = () => {
    this.setState({ isOpen: true });
  };

  render() {
    const { trigger, channels, msTeamsChannels, showCopyLink = false } = this.props;
    const { comment, channelId, teamsChannel, loadingSlack, loadingTeams } = this.state;

    const slackOptions = channels
      .map(({ webhookId, name }) => ({ value: webhookId, label: name }))
      .toJS();

    const msTeamsOptions = msTeamsChannels
      .map(({ webhookId, name }) => ({ value: webhookId, label: name }))
      .toJS();

    return (
      <Popover
        onOpen={() => this.setState({ isOpen: true })}
        onClose={() => this.setState({ isOpen: false, comment: '' })}
        render={() => (
          <div className={styles.wrapper}>
            {this.state.loadingTeams || this.state.loadingSlack ? (
              <Loader loading />
            ) : (
              <>
                <div className="text-xl mr-4 font-semibold mb-4">
                  Share
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
                        <Form.Field className="mb-15-imp">
                          <label>Share to slack</label>
                          <div className="grid grid-cols-6 gap-4">
                            <Select
                              options={slackOptions}
                              defaultValue={channelId}
                              onChange={this.changeSlackChannel}
                              className="col-span-4"
                            />
                            {this.state.channelId && (
                              <Button
                                onClick={this.shareToSlack}
                                icon="integrations/slack-bw"
                                variant="outline"
                                className="col-span-2"
                              >
                                {loadingSlack ? 'Sending...' : 'Send'}
                              </Button>
                            )}
                          </div>
                        </Form.Field>
                      )}
                      {msTeamsOptions.length > 0 && (
                        <Form.Field className="mb-15-imp">
                          <label>Share to MS Teams</label>
                          <div className="grid grid-cols-6 gap-4">
                            <Select
                              options={msTeamsOptions}
                              defaultValue={teamsChannel}
                              onChange={this.changeTeamsChannel}
                              className="col-span-4"
                            />
                            {this.state.teamsChannel && (
                              <Button
                                onClick={this.shareToMSTeams}
                                icon="integrations/teams-white"
                                variant="outline"
                                className="col-span-2"
                              >
                                {loadingTeams ? 'Sending...' : 'Send'}
                              </Button>
                            )}
                          </div>
                        </Form.Field>
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
