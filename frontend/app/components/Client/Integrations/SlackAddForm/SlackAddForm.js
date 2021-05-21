import React from 'react'
import { connect } from 'react-redux'
import { edit, save, init, update } from 'Duck/integrations/slack'
import { Form, Input, Button, Message } from 'UI'
import { confirm } from 'UI/Confirmation';
import { remove } from 'Duck/integrations/slack'

class SlackAddForm extends React.PureComponent {
  componentWillUnmount() {
    this.props.init({});
  }
  
  save = () => {
    const instance = this.props.instance;
    if(instance.exists()) {
      this.props.update(this.props.instance)
    } else {
      this.props.save(this.props.instance)
    } 
  }

  remove = async (id) => {
    if (await confirm({
      header: 'Confirm',
      confirmButton: 'Yes, Delete',
      confirmation: `Are you sure you want to permanently delete this channel?`
    })) {
      this.props.remove(id);
    }
  }

  write = ({ target: { name, value } }) => this.props.edit({ [ name ]: value });

  render() {
    const { instance, saving, errors, onClose } = this.props;
    return (
      <div className="p-5" style={{ minWidth: '300px'}}>
        <Form>
          <Form.Field>
            <label>Name</label>
            <Input
              name="name"
              value={ instance.name }
              onChange={ this.write }
              placeholder="Enter any name"
              type="text"
            />
          </Form.Field>
          <Form.Field>
            <label>URL</label>
            <Input
              name="endpoint"
              value={ instance.endpoint }
              onChange={ this.write }
              placeholder="Slack webhook URL"
              type="text"
            />
          </Form.Field>
          <div className="flex justify-between">
            <div className="flex">
              <Button
                onClick={ this.save }
                disabled={ !instance.validate() }
                loading={ saving }
                primary
                marginRight
              >
                { instance.exists() ? 'Update' : 'Add' }
              </Button>

              <Button
                onClick={ onClose }
                // disabled={ !instance.validate() }
                // loading={ saving }
                outline
                plain
              >
                { 'Cancel' }
              </Button>
            </div>

            <Button
              onClick={ () => this.remove(instance.webhookId) }
              disabled={ !instance.exists() }
              // loading={ saving }
              plain
            >
              { 'Delete' }
            </Button>
          </div>
        </Form>      

        { errors &&
          <div className="my-3">
            { errors.map(error => <Message visible={ errors }  size="mini" error key={ error } >{ error }</Message>) }
          </div>
        }
      </div>
    )
  }
}

export default connect(state => ({
  instance: state.getIn(['slack', 'instance']),
  saving: state.getIn(['slack', 'saveRequest', 'loading']),
  errors: state.getIn([ 'slack', 'saveRequest', 'errors' ]),
}), { edit, save, init, remove, update })(SlackAddForm)