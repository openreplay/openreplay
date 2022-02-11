import { connect } from 'react-redux';
import { toast } from 'react-toastify';
import withRequest from 'HOCs/withRequest';
import { Popup, Dropdown, Icon, IconButton } from 'UI';
import { pause } from 'Player';
import styles from './sharePopup.css';
import IntegrateSlackButton from '../IntegrateSlackButton/IntegrateSlackButton';
import SessionCopyLink from './SessionCopyLink';

@connect(state => ({
  channels: state.getIn([ 'slack', 'list' ]),
  tenantId: state.getIn([ 'user', 'client', 'tenantId' ]),
}))
@withRequest({
  endpoint: ({ id, entity }, integrationId) => 
    `/integrations/slack/notify/${ integrationId }/${entity}/${ id }`,
  method: "POST",
})
export default class SharePopup extends React.PureComponent {
  state = {
    comment: '',
    isOpen: false,
    channelId: this.props.channels.getIn([ 0, 'webhookId' ]),
  }

  editMessage = e => this.setState({ comment: e.target.value })
  share = () => this.props.request({ comment: this.state.comment }, this.state.channelId)
    .then(this.handleSuccess)

  handleOpen = () => {
    this.setState({ isOpen: true });
    pause();
    setTimeout(function() {
      document.getElementById('message').focus();
    }, 100)
  }

  handleClose = () => { 
    this.setState({ isOpen: false, comment: '' });
  }

  handleSuccess = () => {
    toast.success('Your comment is shared.');
    this.handleClose();
  }

  changeChannel = (e, { value }) => this.setState({ channelId: value })

  render() {
    const { trigger, loading, channels, showCopyLink = false } = this.props;
    const { comment, isOpen, channelId } = this.state;

    const options = channels.map(({ webhookId, name }) => ({ value: webhookId, text: name })).toJS();
    return (
      <Popup
        open={ isOpen }
        onOpen={ this.handleOpen }
        onClose={ this.handleClose }
        trigger={ trigger }
        content={ 
          <div className={ styles.wrapper }>
            <div className={ styles.header }>
              <div className={ styles.title }>{ 'Comment' }</div>
            </div>
            { options.length === 0 ?
              <>
                <div className={ styles.body }>
                  <IntegrateSlackButton />
                </div>
                { showCopyLink && (
                  <div className={styles.footer}>
                    <SessionCopyLink /> 
                  </div>
                )}
              </>
            :
              <div>
                <div className={ styles.body }>
                  <textarea
                    name="message"
                    id="message"
                    cols="30"
                    rows="4"
                    resize="none"
                    onChange={ this.editMessage }
                    value={ comment }
                    placeholder="Type here..."
                    className="p-4"
                  />

                  <div className="flex items-center justify-between">
                    <Dropdown
                      selection
                      options={ options } 
                      value={ channelId } 
                      onChange={ this.changeChannel }
                      className="mr-4"
                    />
                    <div>
                      <button
                        className={ styles.shareButton }
                        onClick={ this.share }
                      >
                        <Icon name="integrations/slack" size="18" marginRight="10" />
                        { loading ? 'Sharing...' : 'Share' }
                      </button>
                    </div>
                  </div>
                </div>
                <div className={ styles.footer }>
                  <SessionCopyLink /> 
                </div>
               
              </div>
            }
          </div>
        }
        on="click"
        position="top right"
        className={ styles.popup }
        hideOnScroll
      />
    );
  }
}
