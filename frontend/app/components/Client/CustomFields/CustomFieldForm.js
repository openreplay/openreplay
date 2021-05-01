import { connect } from 'react-redux';
import { edit, save } from 'Duck/customField';
import { Form, Button, Message } from 'UI';
import styles from './customFieldForm.css';

@connect(state => ({
  field: state.getIn(['customFields', 'instance']),
  saving: state.getIn(['customFields', 'saveRequest', 'loading']),
  errors: state.getIn([ 'customFields', 'saveRequest', 'errors' ]),
}), {
  edit,
  save,
})
class CustomFieldForm extends React.PureComponent {
  setFocus = () => this.focusElement.focus();
  onChangeSelect = (event, { name, value }) => this.props.edit({ [ name ]: value });
  write = ({ target: { value, name } }) => this.props.edit({ [ name ]: value });

  render() {
    const { field, errors} = this.props;
    const exists = field.exists();
    return (
      <Form className={ styles.wrapper }>
        <Form.Field>
          <label>{'Field Name'}</label>
          <input
            ref={ (ref) => { this.focusElement = ref; } }
            name="key"
            value={ field.key }
            onChange={ this.write }
            placeholder="Field Name"
          />
        </Form.Field>      

        { errors &&
          <div className="mb-3">
            { errors.map(error => <Message visible={ errors }  size="mini" error key={ error } className={ styles.error }>{ error }</Message>) }
          </div>
        }

        <Button
          onClick={ () => this.props.onSave(field) }
          disabled={ !field.validate() }
          loading={ this.props.saving }
          primary
          marginRight
        >
          { exists ? 'Update' : 'Add' }
        </Button>
        <Button
          data-hidden={ !exists }
          onClick={ this.props.onClose }
          outline
        >
          { 'Cancel' }
        </Button>
      </Form>
    );
  }
}

export default CustomFieldForm;
