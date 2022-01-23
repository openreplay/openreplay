import React, { useEffect, useState } from 'react'
import { SlideModal, IconButton } from 'UI';
import { init, edit, save, remove } from 'Duck/alerts';
import { fetchList as fetchWebhooks } from 'Duck/webhook';
import AlertForm from '../AlertForm';
import { connect } from 'react-redux';
import { setShowAlerts } from 'Duck/dashboard';
import { EMAIL, SLACK, WEBHOOK } from 'App/constants/schedule';
import { confirm } from 'UI/Confirmation';

interface Props {
  showModal?: boolean;
  metricId?: number;
  onClose: () => void;
}
function AlertFormModal(props) {
  const { metricId = null, showModal = false, webhooks, setShowAlerts } = props;
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    props.fetchWebhooks();
  }, [])

  const slackChannels = webhooks.filter(hook => hook.type === SLACK).map(({ webhookId, name }) => ({ value: webhookId, text: name })).toJS();
  const hooks = webhooks.filter(hook => hook.type === WEBHOOK).map(({ webhookId, name }) => ({ value: webhookId, text: name })).toJS();

  const saveAlert = instance => {
    const wasUpdating = instance.exists();
    props.save(instance).then(() => {
      if (!wasUpdating) {
        toggleForm(null, false);
      }
    })
  }

  const onDelete = async (instance) => {
    if (await confirm({
      header: 'Confirm',
      confirmButton: 'Yes, Delete',
      confirmation: `Are you sure you want to permanently delete this alert?`
    })) {
      props.remove(instance.alertId).then(() => {
        toggleForm(null, false);
      });
    }
  }

  const toggleForm = (instance, state) => {
    if (instance) {
      props.init(instance)
    }
    return setShowForm(state ? state : !showForm);
  }

  return (
    <SlideModal
        title={
          <div className="flex items-center">
            <span className="mr-3">{ 'Create Alert' }</span>
            <IconButton 
              circle
              size="small"
              icon="plus" 
              outline
              id="add-button"
              onClick={ () => toggleForm({}, true) }
            />
          </div>
        }
        isDisplayed={ showModal }
        onClose={props.onClose}
        size="medium"
        content={ showModal &&
          <AlertForm
            metricId={ props.metricId }
            edit={props.edit}
            slackChannels={slackChannels}
            webhooks={hooks}
            onSubmit={saveAlert}
            onClose={props.onClose}
            onDelete={onDelete}
          />
      }
      />
  );
}

export default connect(state => ({
  webhooks: state.getIn(['webhooks', 'list']),
  instance: state.getIn(['alerts', 'instance']),
}), { init, edit, save, remove, fetchWebhooks, setShowAlerts })(AlertFormModal)