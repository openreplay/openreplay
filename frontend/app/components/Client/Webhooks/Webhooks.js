import { connect } from 'react-redux';
import cn from 'classnames';
import withPageTitle from 'HOCs/withPageTitle';
import { IconButton, SlideModal, Loader, NoContent } from 'UI';
import { init, fetchList, remove } from 'Duck/webhook';
import WebhookForm from './WebhookForm';
import ListItem from './ListItem';
import styles from './webhooks.css';

@connect(state => ({
  webhooks: state.getIn(['webhooks', 'list']),
  loading: state.getIn(['webhooks', 'loading']),
}), {
  init,
  fetchList,
  remove,
})
@withPageTitle('Webhooks - OpenReplay Preferences')
class Webhooks extends React.PureComponent {
  state = { showModal: false };

  componentWillMount() {
    this.props.fetchList();
  }

  closeModal = () => this.setState({ showModal: false });
  init = (v) => {
    this.props.init(v);
    this.setState({ showModal: true });    
  }

  removeWebhook = id => {
    const sure = window.confirm("Are you sure you want to remove this webhook?");
    if (!sure) return;
    this.props.remove(id);
  }

  render() {
    const { webhooks, loading } = this.props;
    const { showModal } = this.state;

    const noSlackWebhooks = webhooks.filter(hook => hook.type !== 'slack');
    return (
      <div>
        <SlideModal
          title="Add Webhook"
          size="small"
          isDisplayed={ showModal }
          content={ <WebhookForm onClose={ this.closeModal } /> }
          onClose={ this.closeModal }
        />
        <div className={ styles.tabHeader }>
          <h3 className={ cn(styles.tabTitle, "text-2xl") }>{ 'Webhooks' }</h3>
          <IconButton circle icon="plus" outline onClick={ () => this.init() } />
        </div>
        
        <Loader loading={ loading }>
          <NoContent
            title="No webhooks available."
            size="small"
            show={ noSlackWebhooks.size === 0 }
            icon
          >
            <div className={ styles.list }>
              { noSlackWebhooks.map(webhook => (
                <ListItem
                  key={ webhook.key }
                  webhook={ webhook }
                  onEdit={ () => this.init(webhook) } 
                  onDelete={ () => this.removeWebhook(webhook.webhookId) }
                />
              ))}
            </div>
          </NoContent>
        </Loader>
      </div>
    );
  }
}

export default Webhooks;