import React from 'react';
import { Button, Checkbox, Input } from 'antd';
import { useHistory } from 'react-router-dom';
import { withSiteId, sessions } from 'App/routes';
import { useStore } from 'App/mstore';
import { useTranslation } from 'react-i18next';

interface Props {
  onSave: (
    name: string,
    ignoreClRage: boolean,
    ignoreDeadCl: boolean,
  ) => Promise<any>;
  hideModal: () => void;
}

function SaveModal({ onSave, hideModal }: Props) {
  const { t } = useTranslation();
  const history = useHistory();
  const { projectsStore, searchStore } = useStore();
  const [name, setName] = React.useState('');
  const [ignoreClRage, setIgnoreClRage] = React.useState(false);
  const [ignoreDeadCl, setIgnoreDeadCl] = React.useState(false);

  const save = () => {
    void onSave(name, ignoreClRage, ignoreDeadCl);
    hideModal();
  };
  const saveAndOpen = () => {
    onSave(name, ignoreClRage, ignoreDeadCl).then((tagId) => {
      hideModal();
      const siteId = projectsStore.getSiteId() as unknown as string;
      searchStore.addFilterByKeyAndValue('tag', tagId.toString());
      history.push(withSiteId(sessions(), siteId));
    });
  };
  return (
    <div className="h-screen bg-white p-4 flex flex-col gap-4">
      <div className="font-semibold text-xl">{t('Tag Element')}</div>
      <div className="w-full border border-b-light-gray" />
      <div>
        <div className="font-semibold">{t('Name')}</div>
        <Input
          placeholder="E.g Buy Now Button"
          className="w-full"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div>
        <div className="font-semibold">
          {t('Ignore following actions on this element')}
        </div>
        <div className="flex gap-2">
          <Checkbox
            checked={ignoreClRage}
            onChange={(e) => setIgnoreClRage(e.target.checked)}
          >
            {t('Click Rage')}
          </Checkbox>
          <Checkbox
            checked={ignoreDeadCl}
            onChange={(e) => setIgnoreDeadCl(e.target.checked)}
          >
            {t('Dead Click')}
          </Checkbox>
        </div>
      </div>
      <div className="w-full border border-b-light-gray" />
      <div className="flex gap-2">
        <Button type="primary" disabled={name === ''} onClick={save}>
          {t('Tag')}
        </Button>
        <Button type="default" disabled={name === ''} onClick={saveAndOpen}>
          {t('Tag & Find Element')}
        </Button>
        <Button type="primary" ghost onClick={hideModal}>
          {t('Cancel')}
        </Button>
      </div>
    </div>
  );
}

export default SaveModal;
