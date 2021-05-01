import React from 'react';
import { Form, Input, Button } from 'UI';
import { connect } from 'react-redux';
import { save, edit } from 'Duck/rehydrate';
import DatePicker from 'react-datepicker';

class JobForm extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = { };
  }

  write = ({ target: { name, value } }) => this.props.edit({ [ name ]: value });
  writeOption = (e, { name, value }) => this.props.edit({ [ name ]: value });
  onSubmit = () => {
    this.props.save(this.props.instance).then(() => this.props.onCancel())
  }

  handleStartDateChange = (startAt) => {
    const { endAt: currentEndDate } = this.state;
    const endAt = currentEndDate - startAt > 0
      ? currentEndDate
      : new Date();
    this.setState({ startAt, endAt });
    this.props.edit({ startAt: startAt.getTime(), endAt: endAt.getTime() })    
  }

  handleEndDateChange = (endAt) => {
    this.setState({ endAt });
    this.props.edit({ endAt: endAt.getTime() })
  }

  render() {
    const { instance = {}, creating, onCancel, saving } = this.props;
    const { startAt, endAt } = this.state;
    const now = new Date();
    return (
      <Form onSubmit={ this.onSubmit }>
        <Form.Field>
          <label htmlFor="name">Job Name</label>
          <Input
            id="name"
            name="name"
            value={ instance.name }
            placeholder='E.g. Slow Sessions'
            onChange={ this.write }
          />
        </Form.Field>

        <Form.Field>
          <div className="flex -mx-2">
            <div className="w-1/2 px-2">
                <label htmlFor="startDate">Start</label>
                <DatePicker
                  selected={ startAt }
                  name="startAt"
                  onChange={ this.handleStartDateChange }
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={ 30 }
                  dateFormat="MMM d, yyyy h:mm aa"
                  timeCaption="Time"
                  maxDate={ now }                  
                  placeholderText="Start"
                />
            </div>
            <div className="w-1/2 px-2">
              <label htmlFor="endDate">To</label>
                <DatePicker
                  selected={ endAt }
                  name="endAt"
                  onChange={ this.handleEndDateChange }
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={ 30 }
                  dateFormat="MMM d, yyyy h:mm aa"
                  timeCaption="Time"
                  maxDate={ now }                  
                  placeholderText="To"
                />
            </div>
          </div>
        </Form.Field>

        <Button
          loading={ saving }
          primary
          disabled={ !instance.validate() }
          marginRight
        >
          {'Rehydrate'}
        </Button>
        
        <Button
          type="button"
          outline
          onClick={ onCancel }
        >
          {'Cancel'}
        </Button>
      </Form>
    );
  }
}

export default connect(state => ({
  instance: state.getIn(['rehydrate', 'instance']),
  saving: state.getIn(['rehydrate', 'saveRequest', 'loading'])
}), { save, edit })(JobForm);
