import { connect } from 'react-redux';
import { Modal, Button, Form, Dropdown, Icon } from 'UI';
import { save as saveSchedule, edit as editSchedule } from 'Duck/schedules';
import styles from './scheduleUpdater.css';

const HOURS = [ ...Array(24).keys() ].map(i => ({ value: i, text: `${ i > 9 ? '' : '0' }${ i }:00` }));

const DAYS = [
  {
    value: -1,
    text: 'Everyday',
  },
  {
    value: 0,
    text: 'Sunday',
  },
  {
    value: 1,
    text: 'Monday',
  },
  {
    value: 2,
    text: 'Tuesday',
  },
  {
    value: 3,
    text: 'Wednesday',
  },
  {
    value: 4,
    text: 'Thursday',
  },
  {
    value: 5,
    text: 'Friday',
  },
  {
    value: 6,
    text: 'Saturday',
  },

];

@connect(state => ({
  loading: state.getIn([ 'schedules', 'saveRequest', 'loading' ]),
  schedule: state.getIn([ 'schedules', 'instance' ]),
}), { saveSchedule, editSchedule })
export default class ScheduleUpdater extends React.PureComponent {
  onSave = () => {
    const { onClose, schedule } = this.props;
    this.props.saveSchedule(schedule)
      .then(onClose);
  }

  onSelectChanged = (event, { name, value }) => this.props.editSchedule({ [ name ]: value });
  write = ({ target: { name, value } }) => this.props.editSchedule({ [ name ]: value });

  render() {
    const {
      onClose,
      loading,
      schedule,
      isDisplayed = schedule.exists(),
    } = this.props;
    const { hour, day, name } = schedule;

    const isNew = !schedule.exists();

    return (
      <Modal size="tiny" open={ isDisplayed }>
        <Modal.Header className={ styles.modalHeader }>
          <div>{'Schedule Test:'}</div>
          <Icon 
            role="button"
            tabIndex="-1"
            color="gray-dark"
            size="18"
            name="close"
            onClick={ onClose }
          />
        </Modal.Header>
        <Modal.Content>
          <Form disabled={ loading }>
            <Form.Field>
              <label>{'Test Name:'}</label>
              <input
                className={ styles.name }
                name="name"
                value={ name }
                onChange={ this.write }
              />
            </Form.Field>
            <Form.Field>
              <label>{'Occurence:'}</label>
              <div className={ styles.scheduleControls }>
                <Dropdown
                  name="day"
                  selection
                  options={ DAYS }
                  onChange={ this.onSelectChanged }
                  className="customLightDropdown"
                  value={ day }
                />
                <Dropdown
                  name="hour"
                  selection
                  options={ HOURS }
                  onChange={ this.onSelectChanged }
                  className="customLightDropdown"
                  value={ hour }
                />
              </div>
            </Form.Field>
          </Form>
        </Modal.Content>
        <Modal.Actions>
          <Button onClick={ onClose } basic>{ 'Cancel' }</Button>
          <Button onClick={ this.onSave } primary loading={ loading }>{ isNew ? 'Add' : 'Schedule' }</Button>
        </Modal.Actions>
      </Modal>
    );
  }
}
