import { connect } from 'react-redux';
import { Icon, SlideModal } from 'UI';
import withToggle from 'HOCs/withToggle';
import { save, edit } from 'Duck/alerts';

import styles from './alertManager.css';
import AlertForm from './AlertForm';

@connect(state => ({
  alert: state.getIn([ 'alerts', 'instance' ]),
  loading: state.getIn([ 'alerts', 'saveRequest', 'loading' ]),
  filter: state.getIn([ 'filters', 'appliedFilter' ]),
}), {
  save,
  edit,  
})
@withToggle('isModalDisplayed', 'toggleModal')
export default class AlertManager extends React.PureComponent {
  write = (e, { name, value }) => {
    this.props.edit({ [ name ]: value });
  }

  save = () => {
    const { toggleModal, alert, filter } = this.props;
    this.props.save(alert.set('filter', filter))
      .then(toggleModal);
  }

  render() {
    const {
      isModalDisplayed, alert, toggleModal, loading,
    } = this.props;
    return (
      <React.Fragment>        
        <div className={ styles.button } onClick={ toggleModal }>
          <Icon name="search_notification" color="teal" size="16" />
        </div>
        <SlideModal
          title="Alert"
          isDisplayed={ isModalDisplayed }
          onClose={ toggleModal }
          size="small"
          content={
            <div className={ styles.wrapper }>
              <AlertForm
                alert={ alert }
                onSave={ this.save }
                write={ this.write }
                loading={ loading }
              />
            </div>
          }
        />
      </React.Fragment>
    );
  }
}
