/* eslint-disable i18next/no-literal-string */
import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import { Checkbox } from 'UI';
import cn from 'classnames';
import Select from 'Shared/Select';
import styles from './projectCodeSnippet.module.css';
import CodeSnippet from '../../CodeSnippet';
import { useTranslation } from 'react-i18next';

const inputModeOptionsMap = {};
inputModeOptions.forEach((o, i) => (inputModeOptionsMap[o.value] = i));

function ProjectCodeSnippet(props) {
  const { projectsStore } = useStore();
  const { site } = props;
  const { gdpr } = site;
  const saveGdpr = projectsStore.saveGDPR;
  const editGdpr = projectsStore.editGDPR;
  const [changed, setChanged] = useState(false);
  const { t } = useTranslation();

  const inputModeOptions = [
    { label: t('Record all inputs'), value: 'plain' },
    { label: t('Obscure all inputs'), value: 'hidden' },
    { label: t('Ignore all inputs'), value: 'obscured' },
  ];

  const saveGDPR = () => {
    setChanged(true);
    void saveGdpr(site.id);
  };

  const onChangeSelect = ({ name, value }) => {
    editGdpr({ [name]: value });
    saveGDPR();
  };

  const onChangeOption = ({ target: { name, checked } }) => {
    editGdpr({ [name]: checked });
    saveGDPR();
  };

  return (
    <div>
      <div className="mb-4">
        <div className="font-semibold mb-2">
          {t('1. Choose data recording options')}
        </div>
        <div className="flex items-center justify-between">
          <Select
            name="defaultInputMode"
            options={inputModeOptions}
            onChange={({ value }) =>
              onChangeSelect({ name: 'defaultInputMode', value: value.value })
            }
            placeholder={t('Default Input Mode')}
            value={inputModeOptions.find(
              (o) => o.value === gdpr.defaultInputMode,
            )}
          />

          <Checkbox
            name="maskNumbers"
            type="checkbox"
            checked={gdpr.maskNumbers}
            onChange={onChangeOption}
            className="mr-2"
            label={t('Do not record any numeric text')}
          />

          <Checkbox
            name="maskEmails"
            type="checkbox"
            checked={gdpr.maskEmails}
            onChange={onChangeOption}
            className="mr-2"
            label={t('Do not record email addresses')}
          />
        </div>
      </div>
      <div
        className={cn(styles.info, 'rounded bg-gray mt-2 mb-4', {
          hidden: !changed,
        })}
      >
        &nbsp;
        {t(
          'Below code snippet changes depending on the data recording options chosen.',
        )}
      </div>
      <div className={styles.instructions}>
        <div>
          <span className="font-semibold">{t('2. Paste this snippet')}</span>
          <span>{t('before the')}&nbsp;</span>
          {}
          <span className={styles.highLight}>{'</head>'}</span>
          <span>&nsbp;{t('tag of your page.')}</span>
        </div>
        <div className={styles.siteId}>
          {t('Project Key:')}&nbsp;<span>{site.projectKey}</span>
        </div>
      </div>
      <div className={styles.snippetsWrapper}>
        <CodeSnippet
          host={site && site.host}
          projectKey={site && site.projectKey}
          ingestPoint={`"https://${window.location.hostname}/ingest"`}
          defaultInputMode={gdpr.defaultInputMode}
          obscureTextNumbers={gdpr.maskNumbers}
          obscureTextEmails={gdpr.maskEmails}
        />
      </div>
      <div className="my-4">
        {t('You can also setup OpenReplay using')}
        <a
          className="link"
          href="https://docs.openreplay.com/integrations/google-tag-manager"
          target="_blank"
          rel="noreferrer"
        >
          {t('Google Tag Manager (GTM)')}
        </a>
        .{' '}
      </div>
    </div>
  );
}

export default observer(ProjectCodeSnippet);
