import { connect } from 'react-redux';
import { Button, Modal, Form, Icon, Checkbox } from 'UI';
import styles from './funnelSaveModal.css';
import { edit, save, fetchList as fetchFunnelsList } from 'Duck/funnels';

@connect(state => ({
  filter: state.getIn(['search', 'instance']),
  funnel: state.getIn(['funnels', 'instance']),
  loading: state.getIn([ 'funnels', 'saveRequest', 'loading' ]) || 
    state.getIn([ 'funnels', 'updateRequest', 'loading' ]),
}), { edit, save, fetchFunnelsList })
export default class FunnelSaveModal extends React.PureComponent {
  state = { name: 'Untitled', isPublic: false };
  static getDerivedStateFromProps(props) {
    if (!props.show) {
      return {
        name: props.funnel.name || 'Untitled',
        isPublic: props.funnel.isPublic,
      };
    }
    return null;
  }

  onNameChange = ({ target: { value } }) => {
    this.props.edit({ name: value });
  };

  onChangeOption = (e, { checked, name }) => this.props.edit({ [ name ]: checked })

  onSave = () => {
    const { funnel, filter } = this.props;
    if (funnel.name.trim() === '') return;
    this.props.save(funnel).then(function() {
      this.props.fetchFunnelsList();
      this.props.closeHandler();
    }.bind(this));
  }

  render() {
    const {
      show,
      closeHandler,
      loading,
      funnel
    } = this.props;
    
    return (
      <Modal size="tiny" open={ show }>
        <Modal.Header className={ styles.modalHeader }>
          <div>{ 'Save Funnel' }</div>
          <Icon 
            role="button"
            tabIndex="-1"
            color="gray-dark"
            size="14"
            name="close"
            onClick={ closeHandler }
          />
        </Modal.Header>

        <Modal.Content>
          <Form onSubmit={this.onSave}>
            <Form.Field>
              <label>{'Title:'}</label>
              <input
                autoFocus={ true }
                className={ styles.name }
                name="name"
                value={ funnel.name }
                onChange={ this.onNameChange }
                placeholder="Title"
              />
            </Form.Field>

            <Form.Field>
              <div className="flex items-center">
                <Checkbox
                  name="isPublic"
                  className="font-medium"
                  type="checkbox"
                  checked={ funnel.isPublic }
                  onClick={ this.onChangeOption }
                  className="mr-3"                
                />
                <div className="flex items-center cursor-pointer" onClick={ () => this.props.edit({ 'isPublic' : !funnel.isPublic }) }>
                  <Icon name="user-friends" size="16" />
                  <span className="ml-2"> Team Visible</span>
                </div>
              </div>
            </Form.Field>
          </Form>
        </Modal.Content>
        <Modal.Actions className="">          
          <Button
            primary
            onClick={ this.onSave }
            loading={ loading }
          >
            { funnel.exists() ? 'Modify' : 'Save' }
          </Button>
          <Button className={ styles.cancelButton } marginRight onClick={ closeHandler }>{ 'Cancel' }</Button>
        </Modal.Actions>
      </Modal>
    );
  }
}
