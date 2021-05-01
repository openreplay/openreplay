import { connect } from 'react-redux';
import { Button, Select, Input, Icon } from 'UI';
import { editGDPR, saveGDPR } from 'Duck/site';
import { validateNumber } from 'App/validate';
import styles from './siteForm.css';

const inputModeOptions = [
  { text: 'Record all inputs', value: 'plain' },
  { text: 'Ignore all inputs', value: 'obscured' },
  { text: 'Obscure all inputs', value: 'hidden' },
];

@connect(state => ({
  site: state.getIn([ 'site', 'instance' ]),
  gdpr: state.getIn([ 'site', 'instance', 'gdpr' ]),
  saving: state.getIn([ 'site', 'saveGDPR', 'loading' ]),
}), {
  editGDPR,
  saveGDPR,
})
export default class GDPRForm extends React.PureComponent {
  onChange = ({ target: { name, value } }) => {
    if (name === "sampleRate") {
      if (!validateNumber(value, { min: 0, max: 100 })) return;
      if (value.length > 1 && value[0] === "0") {
        value = value.slice(1);
      }
    }
    this.props.editGDPR({ [ name ]: value });
  }

  onSampleRateBlur = ({ target: { name, value } }) => { //TODO: editState hoc
    if (value === ''){
      this.props.editGDPR({ sampleRate: 100 });
    }
  }

  onChangeSelect = (event, { name, value }) => {
    this.props.editGDPR({ [ name ]: value });
  };

  onChangeOption = ({ target: { checked, name } }) => {
    this.props.editGDPR({ [ name ]: checked });
  }

  onSubmit = (e) => {
    e.preventDefault();
    const { site, gdpr } = this.props;
    this.props.saveGDPR(site.id, gdpr);
  }

  render() {
    const {
      site, onClose, saving, gdpr,
    } = this.props;

    return (
      <form className={ styles.formWrapper } onSubmit={ this.onSubmit }>
        <div className={ styles.content }>
          <div className={ styles.formGroup }>
            <label>{ 'Name' }</label>
            <div>{ site.host }</div>
          </div>
          <div className={ styles.formGroup }>
            <label>{ 'Session Capture Rate' }</label>
            <Input
              icon="percent"
              name="sampleRate"
              value={ gdpr.sampleRate }
              onChange={ this.onChange }
              onBlur={ this.onSampleRateBlur }
              className={ styles.sampleRate }
            />
          </div>

          <div className={ styles.formGroup }>
            <label htmlFor="defaultInputMode">{ 'Data Recording Options' }</label>
            <Select
              name="defaultInputMode"
              options={ inputModeOptions }
              onChange={ this.onChangeSelect }
              placeholder="Default Input Mode"
              value={ gdpr.defaultInputMode }
              className={ styles.dropdown }
            />
          </div>

          <div className={ styles.formGroup }>
            <label>
              <input
                name="maskNumbers"
                type="checkbox"
                checked={ gdpr.maskNumbers }
                onChange={ this.onChangeOption }
              />
              { 'Do not record any numeric text' }
              <div className={ styles.controlSubtext }>{ 'If enabled, OpenReplay will not record or store any numeric text for all sessions.' }</div>
            </label>
          </div>

          <div className={ styles.formGroup }>
            <label>
              <input
                name="maskEmails"
                type="checkbox"
                checked={ gdpr.maskEmails }
                onChange={ this.onChangeOption }
              />
              { 'Do not record email addresses ' }
              <div className={ styles.controlSubtext }>{ 'If enabled, OpenReplay will not record or store any email address for all sessions.' }</div>
            </label>
          </div>

          <div className={ styles.blockIpWarapper }>
            <div className={ styles.button } onClick={ this.props.toggleBlockedIp }>
              { 'Block IP' } <Icon name="next1" size="18" />
            </div>
          </div>
        </div>

        <div className={ styles.footer }>
          <Button
            outline
            primary
            //onClick={ this.saveGdpr }
            marginRight
            loading={ saving }
            content="Update"
          />
          <Button plain primary onClick={ onClose } content="Cancel" />
        </div>
      </form>
    );
  }
}
