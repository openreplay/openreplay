import React from 'react';
import { connect } from 'react-redux';
import cn from 'classnames';
import withPageTitle from 'HOCs/withPageTitle';
import { IconButton, SlideModal, Loader, NoContent } from 'UI';
import { init, fetchList, remove } from 'Duck/webhook';
import WebhookForm from './WebhookForm';
import ListItem from './ListItem';
import styles from './webhooks.module.css';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import { confirm } from 'UI';
import { toast } from 'react-toastify';

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

  removeWebhook = async (id) => {
    if (await confirm({
      header: 'Confirm',
      confirmButton: 'Yes, delete',
      confirmation: `Are you sure you want to remove this webhook?`
    })) {
      this.props.remove(id).then(() => {
        toast.success('Webhook removed successfully');
      });
    }
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
            title={
              <div className="flex flex-col items-center justify-center">
                <AnimatedSVG name={ICONS.EMPTY_STATE} size="170" />
                <div className="mt-6 text-2xl">No webhooks available.</div>
              </div>
            }
            size="small"
            show={ noSlackWebhooks.size === 0 }
            // animatedIcon="no-results"
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