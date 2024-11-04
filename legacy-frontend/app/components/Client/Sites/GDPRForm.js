import React from 'react';
import { connect } from 'react-redux';
import { Form, Button, Input, Icon } from 'UI';
import { editGDPR, saveGDPR } from 'Duck/site';
import { validateNumber } from 'App/validate';
import styles from './siteForm.module.css';
import Select from 'Shared/Select';

const inputModeOptions = [
  { label: 'Record all inputs', value: 'plain' },
  { label: 'Ignore all inputs', value: 'obscured' },
  { label: 'Obscure all inputs', value: 'hidden' },
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

  onChangeSelect = ({ name, value }) => {
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
      <Form className={ styles.formWrapper } onSubmit={ this.onSubmit }>
        <div className={ styles.content }>
          <Form.Field>
            <label>{ 'Name' }</label>
            <div>{ site.host }</div>
          </Form.Field>
          <Form.Field>
            <label>{ 'Session Capture Rate' }</label>
            <Input
              icon="percent"
              name="sampleRate"
              value={ gdpr.sampleRate }
              onChange={ this.onChange }
              onBlur={ this.onSampleRateBlur }
              className={ styles.sampleRate }
            />
          </Form.Field>

          <Form.Field>
            <label htmlFor="defaultInputMode">{ 'Data Recording Options' }</label>
            <Select
              name="defaultInputMode"
              options={ inputModeOptions }
              onChange={ this.onChangeSelect }
              placeholder="Default Input Mode"
              value={ gdpr.defaultInputMode }
              // className={ styles.dropdown }
            />
          </Form.Field>

          <Form.Field>
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
          </Form.Field>

          <Form.Field>
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
          </Form.Field>

          <div className={ styles.blockIpWarapper }>
            <div className={ styles.button } onClick={ this.props.toggleBlockedIp }>
              { 'Block IP' } <Icon name="next1" size="18" />
            </div>
          </div>
        </div>

        <div className={ styles.footer }>
          <Button
            variant="outline"
            className="float-left mr-2"
            loading={ saving }
            content="Update"
          />
          <Button onClick={ onClose } content="Cancel" />
        </div>
      </Form>
    );
  }
}
