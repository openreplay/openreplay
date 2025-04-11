import React from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import { Form, Input, Icon } from 'UI';
import { Button } from 'antd';
import { validateNumber } from 'App/validate';
import Select from 'Shared/Select';
import styles from './siteForm.module.css';
import { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

const inputModeOptions = (t: TFunction) => [
  { label: t('Record all inputs'), value: 'plain' },
  { label: t('Ignore all inputs'), value: 'obscured' },
  { label: t('Obscure all inputs'), value: 'hidden' },
];

function GDPRForm(props) {
  const { t } = useTranslation();
  const { projectsStore } = useStore();
  const site = projectsStore.instance;
  const { gdpr } = site;
  const saving = false; // projectsStore.;
  const { editGDPR } = projectsStore;
  const { saveGDPR } = projectsStore;

  const onChange = ({ target: { name, value } }) => {
    if (name === 'sampleRate') {
      if (!validateNumber(value, { min: 0, max: 100 })) return;
      if (value.length > 1 && value[0] === '0') {
        value = value.slice(1);
      }
    }
    editGDPR({ [name]: value });
  };

  const onSampleRateBlur = ({ target: { name, value } }) => {
    // TODO: editState hoc
    if (value === '') {
      editGDPR({ sampleRate: 100 });
    }
  };

  const onChangeSelect = ({ name, value }) => {
    props.editGDPR({ [name]: value });
  };

  const onChangeOption = ({ target: { checked, name } }) => {
    editGDPR({ [name]: checked });
  };

  const onSubmit = (e) => {
    e.preventDefault();
    void saveGDPR(site.id);
  };

  return (
    <Form className={styles.formWrapper} onSubmit={onSubmit}>
      <div className={styles.content}>
        <Form.Field>
          <label>{t('Name')}</label>
          <div>{site.host}</div>
        </Form.Field>
        <Form.Field>
          <label>{t('Session Capture Rate')}</label>
          <Input
            icon="percent"
            name="sampleRate"
            value={gdpr.sampleRate}
            onChange={onChange}
            onBlur={onSampleRateBlur}
            className={styles.sampleRate}
          />
        </Form.Field>

        <Form.Field>
          <label htmlFor="defaultInputMode">
            {t('Data Recording Options')}
          </label>
          <Select
            name="defaultInputMode"
            options={inputModeOptions(t)}
            onChange={onChangeSelect}
            placeholder={t('Default Input Mode')}
            value={gdpr.defaultInputMode}
          />
        </Form.Field>

        <Form.Field>
          <label>
            <input
              name="maskNumbers"
              type="checkbox"
              checked={gdpr.maskNumbers}
              onChange={onChangeOption}
            />
            {t('Do not record any numeric text')}
            <div className={styles.controlSubtext}>
              {t(
                'If enabled, OpenReplay will not record or store any numeric text for all sessions.',
              )}
            </div>
          </label>
        </Form.Field>

        <Form.Field>
          <label>
            <input
              name="maskEmails"
              type="checkbox"
              checked={gdpr.maskEmails}
              onChange={onChangeOption}
            />
            {t('Do not record email addresses')}&nbsp;
            <div className={styles.controlSubtext}>
              {t(
                'If enabled, OpenReplay will not record or store any email address for all sessions.',
              )}
            </div>
          </label>
        </Form.Field>

        <div className={styles.blockIpWarapper}>
          <div className={styles.button} onClick={props.toggleBlockedIp}>
            {t('Block IP')} <Icon name="next1" size="18" />
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <Button type="primary" className="float-left mr-2" loading={saving}>
          {t('Update')}
        </Button>
        <Button onClick={onClose}>{t('Close')}</Button>
      </div>
    </Form>
  );
}

export default observer(GDPRForm);
