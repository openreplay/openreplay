import { connect } from 'react-redux';
import { Button, Modal, Form, Icon, Checkbox } from 'UI';
import styles from './saveModal.css';

@connect(state => ({
  loading: state.getIn([ 'funnels', 'saveRequest', 'loading' ]) || state.getIn([ 'funnels', 'updateRequest', 'loading' ]),
}))
export default class SaveModal extends React.PureComponent {
  state = { name: 'Untitled', isPublic: false };
  static getDerivedStateFromProps(props) {
    if (!props.saveModalOpen) {
      return {
        name: props.appliedFilter.name || 'Untitled',
      };
    }
    return null;
  }

  onNameChange = ({ target: { value } }) => {
    this.setState({ name: value });
  };

  onChangeOption = (e, { checked, name }) => this.setState({ [ name ]: !this.state.isPublic })

  onSave = () => {
    const { toggleFilterModal } = this.props;
    const { name, isPublic } = this.state;
    if (name.trim() === '') return;
    this.props.updateFilter(name.trim(), isPublic);
  }

  render() {
    const {
      saveModalOpen,
      appliedFilter,
      toggleFilterModal,
      loading,
    } = this.props;
    const { name, isPublic } = this.state;

    return (
      <Modal size="tiny" open={ saveModalOpen }>
        <Modal.Header className={ styles.modalHeader }>
          <div>{ 'Save Funnel' }</div>
          <Icon 
            role="button"
            tabIndex="-1"
            color="gray-dark"
            size="14"
            name="close"
            onClick={ () => toggleFilterModal(false) }
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
                value={ name }
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
                  checked={ isPublic }                  
                  onClick={ () => this.setState({ 'isPublic' : !isPublic }) }
                  className="mr-3"
                />
                <div className="flex items-center cursor-pointer" onClick={ () => this.setState({ 'isPublic' : !isPublic }) }>
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
            { appliedFilter.filterId ? 'Modify' : 'Save' }
          </Button>
          <Button className={ styles.cancelButton } marginRight onClick={ () => toggleFilterModal(false) }>{ 'Cancel' }</Button>
        </Modal.Actions>
      </Modal>
    );
  }
}
