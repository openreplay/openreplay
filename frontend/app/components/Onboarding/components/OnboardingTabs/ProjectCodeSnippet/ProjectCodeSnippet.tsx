import React, { useEffect, useState } from 'react';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { Switch, Checkbox } from 'antd';
import cn from 'classnames';
import Select from 'Shared/Select';
import CodeSnippet from 'Shared/CodeSnippet';
import stl from './projectCodeSnippet.module.css';
import CircleNumber from '../../CircleNumber';
import { useTranslation } from 'react-i18next';

const inputModeOptions = [
  { label: 'Record all inputs', value: 'plain' },
  { label: 'Ignore all inputs', value: 'obscured' },
  { label: 'Obscure all inputs', value: 'hidden' },
];

const inputModeOptionsMap = {};
inputModeOptions.forEach((o, i) => (inputModeOptionsMap[o.value] = i));

function ProjectCodeSnippet() {
  const { t } = useTranslation();
  const { projectsStore } = useStore();
  const { siteId } = projectsStore;
  const site = projectsStore.instance;
  const gdpr = site?.gdpr;
  const sites = projectsStore.list;
  const editGDPR = projectsStore.editGDPR;
  const onSaveGDPR = projectsStore.saveGDPR;
  const init = projectsStore.initProject;
  const [changed, setChanged] = useState(false);
  const [isAssistEnabled, setAssistEnabled] = useState(false);

  useEffect(() => {
    const site = sites.find((s) => s.id === siteId);
    if (site) {
      init(site);
    }
  }, []);

  const saveGDPR = () => {
    setChanged(true);
    void onSaveGDPR(site.id);
  };

  const onChangeSelect = ({ name, value }: any) => {
    editGDPR({ [name]: value });
    saveGDPR();
  };

  const onChangeOption = ({ target: { name, checked } }: any) => {
    editGDPR({ [name]: checked });
    saveGDPR();
  };

  if (!site || !gdpr) {
    return null;
  }

  return (
    <div>
      <div className="mb-4">
        <div className="font-semibold mb-2 flex items-center">
          <CircleNumber text="1" />
          &nbsp;{t('Choose data recording options')}
        </div>

        <div className="ml-10 mb-4" style={{ maxWidth: '50%' }}>
          <Select
            name="defaultInputMode"
            options={inputModeOptions}
            onChange={({ value }) =>
              onChangeSelect({ name: 'defaultInputMode', value: value.value })
            }
            placeholder={t('Default Input Mode')}
            defaultValue={gdpr.defaultInputMode}
          />
        </div>

        <div className="mx-4" />
        <div className="flex items-center ml-10">
          <Checkbox
            name="maskNumbers"
            type="checkbox"
            checked={gdpr.maskNumbers}
            onChange={onChangeOption}
            className="mr-2"
          >
            {t('Do not record any numeric text')}
          </Checkbox>

          <div className="mx-4" />

          <Checkbox
            name="maskEmails"
            type="checkbox"
            checked={gdpr.maskEmails}
            onChange={onChangeOption}
            className="mr-2"
          >
            {t('Do not record email addresses')}
          </Checkbox>
        </div>
      </div>
      <div
        className={cn(stl.info, 'rounded bg-gray mt-2 mb-4 ml-10', {
          hidden: !changed,
        })}
      >
        {t(
          ' Below code snippet changes depending on the data recording options chosen.',
        )}
      </div>

      <div className={cn(stl.instructions, 'mt-8')}>
        <div className="font-semibold flex items-center">
          <CircleNumber text="2" />
          <span>{t('Enable Assist (Optional)')}</span>
        </div>
      </div>
      <div className="ml-10">
        <p>
          {t(
            'OpenReplay Assist allows you to support your users by seeing their live screen and instantly hopping on call (WebRTC) with them without requiring any 3rd-party screen sharing software.',
          )}
        </p>
        <div className="flex items-center gap-2">
          <Switch
            checked={isAssistEnabled}
            className="font-medium mr-2"
            onChange={() => setAssistEnabled(!isAssistEnabled)}
          />
          <span>{t('Yes')}</span>
        </div>
      </div>

      <div className={cn(stl.instructions, 'mt-8')}>
        <div className="font-semibold flex items-center">
          <CircleNumber text="3" />
          <span>{t('Install SDK')}</span>
        </div>
      </div>

      <div className="ml-10 mb-2">
        {t('Paste this snippet')}&nbsp;<span>{t('before the')}&nbsp;</span>
        <span className={stl.highLight}>&nbsp;{t('</head>')}&nbsp;</span>
        <span>&nbsp;{t('tag of your page.')}</span>
      </div>
      <div className={cn(stl.snippetsWrapper, 'ml-10')}>
        <CodeSnippet
          isAssistEnabled={isAssistEnabled}
          host={site && site.host}
          projectKey={site && site.projectKey}
          ingestPoint={`"https://${window.location.hostname}/ingest"`}
          defaultInputMode={gdpr.defaultInputMode}
          obscureTextNumbers={gdpr.maskNumbers}
          obscureTextEmails={gdpr.maskEmails}
        />
      </div>
    </div>
  );
}

export default observer(ProjectCodeSnippet);
