import React, { useEffect, useState } from 'react';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { Loader } from 'UI';
import { Switch, Checkbox, Tag } from 'antd';
import GDPR from 'App/mstore/types/gdpr';
import cn from 'classnames';
import Select from 'Shared/Select';
import CodeSnippet from 'Shared/CodeSnippet';
import CircleNumber from 'Components/Onboarding/components/CircleNumber';
import Project from '@/mstore/types/project';
import stl from './projectCodeSnippet.module.css';
import { useTranslation } from 'react-i18next';
import { TFunction } from 'i18next';

interface InputModeOption {
  label: string;
  value: string;
}

const inputModeOptions: (t: TFunction) => InputModeOption[] = (t) => [
  { label: t('Record all inputs'), value: 'plain' },
  { label: t('Ignore all inputs'), value: 'obscured' },
  { label: t('Obscure all inputs'), value: 'hidden' },
];

interface Props {
  project: Project;
}

const ProjectCodeSnippet: React.FC<Props> = (props) => {
  const { t } = useTranslation();
  const { projectsStore } = useStore();
  const { siteId } = projectsStore;
  const site = props.project;
  const gdpr = site.gdpr as GDPR;
  const sites = projectsStore.list;
  const { editGDPR } = projectsStore;
  const onSaveGDPR = projectsStore.saveGDPR;
  const init = projectsStore.initProject;
  const [changed, setChanged] = useState(false);
  const [isAssistEnabled, setAssistEnabled] = useState(false);
  const [showLoader, setShowLoader] = useState(false);

  useEffect(() => {
    const currentSite = sites.find((s) => s.id === siteId);
    if (currentSite) {
      init(currentSite);
    }
  }, [init, siteId, sites]);

  const saveGDPR = () => {
    setChanged(true);
    void onSaveGDPR(site.id);
  };

  const onChangeSelect = (data: { name: string; value: string }) => {
    editGDPR({ [data.name]: data.value });
    saveGDPR();
  };

  const onChangeOption = (name: string, checked: boolean) => {
    editGDPR({ [name]: checked });
    saveGDPR();
  };

  useEffect(() => {
    setShowLoader(true);
    const timer = setTimeout(() => {
      setShowLoader(false);
    }, 200);
    return () => clearTimeout(timer);
  }, [isAssistEnabled]);

  return (
    <div className="flex flex-col gap-8 mt-4">
      <div>
        <div className="font-medium mb-2 flex gap-2 items-center">
          <CircleNumber text="1" />
          <span>{t('Choose data recording options')}</span>
        </div>

        <div className="ml-8 mb-4 w-fit">
          <Select
            name="defaultInputMode"
            options={inputModeOptions(t)}
            onChange={({ value }) =>
              onChangeSelect({ name: 'defaultInputMode', value: value.value })
            }
            placeholder={t('Default Input Mode')}
            defaultValue={gdpr.defaultInputMode}
          />
        </div>

        <div className="flex items-center ml-8">
          <Checkbox
            checked={gdpr.maskNumbers}
            onChange={(e) => onChangeOption('maskNumbers', e.target.checked)}
            className="mr-2"
          >
            {t('Do not record any numeric text')}
          </Checkbox>

          <div className="mx-4" />

          <Checkbox
            checked={gdpr.maskEmails}
            onChange={(e) => onChangeOption('maskEmails', e.target.checked)}
            className="mr-2"
          >
            {t('Do not record email addresses')}
          </Checkbox>
        </div>
        <div
          className={cn(
            stl.info,
            'rounded-lg bg-gray mb-4 ml-8 bg-amber-50 w-fit text-sm mt-2',
            { hidden: !changed },
          )}
        >
          {t(
            'The code snippet below changes based on the selected data recording options and should be used for implementation.',
          )}
        </div>
      </div>

      <div
        className={cn(
          stl.instructions,
          'flex flex-col !items-start !justify-start',
        )}
      >
        <div className="font-medium flex gap-1 items-center">
          <CircleNumber text="2" />
          <span>{t('Enable Assist (Optional)')}</span>
        </div>

        <div className="ml-7">
          <div className="flex gap-2 items-center">
            <Switch
              checked={isAssistEnabled}
              className="font-normal"
              onChange={() => setAssistEnabled(!isAssistEnabled)}
              size="small"
            />
            <span>{t('Enable')}</span>
          </div>

          <span className="text-sm text-neutral-400">
            {t(
              'OpenReplay Assist allows you to support your users by seeing their live screen and instantly hopping on call (WebRTC) with them without requiring any 3rd-party screen sharing software.',
            )}
          </span>
        </div>
      </div>

      <div className={cn(stl.instructions, '')}>
        <div className="flex flex-col w-full">
          <div className="flex flex-col items-start justify-start gap-2">
            <div className="font-medium flex gap-2 items-center">
              <CircleNumber text="3" />
              <span>{t('Install SDK')}</span>
            </div>

            <div className="ml-8 flex gap-2 items-center">
              <div>
                {t('Paste this snippet')}&nbsp;
                <span>{t('before the')}&nbsp;</span>
              </div>
              <Tag
                color="red"
                bordered={false}
                className="rounded-lg text-base mr-0"
              >
                {' '}
                {'</head>'}{' '}
              </Tag>
              <span>&nbsp;{t('tag of your page.')}&nbsp;</span>
            </div>
          </div>
          <div className={cn(stl.snippetsWrapper, 'ml-8')}>
            {showLoader ? (
              <div style={{ height: '474px' }}>
                <Loader loading />
              </div>
            ) : (
              <CodeSnippet
                isAssistEnabled={isAssistEnabled}
                host={site?.host}
                projectKey={site?.projectKey!}
                ingestPoint={`"https://${window.location.hostname}/ingest"`}
                defaultInputMode={gdpr.defaultInputMode}
                obscureTextNumbers={gdpr.maskNumbers}
                obscureTextEmails={gdpr.maskEmails}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default observer(ProjectCodeSnippet);
