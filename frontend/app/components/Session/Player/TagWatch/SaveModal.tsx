import { Button, Checkbox, Input } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { sessions, withSiteId } from 'App/routes';
import { useHistory } from 'App/routing';

interface Props {
  onSave: (
    name: string,
    ignoreClRage: boolean,
    ignoreDeadCl: boolean,
    location?: string,
  ) => Promise<any>;
  hideModal: () => void;
  currentLocation?: string;
}

function SaveModal({ onSave, hideModal, currentLocation }: Props) {
  const { t } = useTranslation();
  const history = useHistory();
  const { projectsStore, searchStore } = useStore();
  const [name, setName] = React.useState('');
  const [ignoreClRage, setIgnoreClRage] = React.useState(false);
  const [ignoreDeadCl, setIgnoreDeadCl] = React.useState(false);
  const [useLocation, setUseLocation] = React.useState(false);

  const locationValue = useLocation ? currentLocation : undefined;

  const save = () => {
    void onSave(name, ignoreClRage, ignoreDeadCl, locationValue);
    hideModal();
  };
  const saveAndOpen = () => {
    onSave(name, ignoreClRage, ignoreDeadCl, locationValue).then((tagId) => {
      hideModal();
      const siteId = projectsStore.getSiteId() as unknown as string;
      searchStore.addFilterByKeyAndValue('tag', tagId.toString());
      history.push(withSiteId(sessions(), siteId));
    });
  };
  return (
    <div className="h-screen bg-white p-4 flex flex-col gap-4">
      <div className="font-semibold text-xl">{t('Tag Feature')}</div>
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
      {currentLocation ? (
        <div>
          <Checkbox
            checked={useLocation}
            onChange={(e) => setUseLocation(e.target.checked)}
          >
            {t('Use current location')}
          </Checkbox>
          {useLocation && (
            <Input className="mt-2" value={currentLocation} disabled />
          )}
        </div>
      ) : null}
      <div className="w-full border border-b-light-gray" />
      <div className="flex gap-2">
        <Button type="primary" disabled={name === ''} onClick={save}>
          {t('Save Feature')}
        </Button>
        <Button onClick={hideModal}>{t('Cancel')}</Button>
      </div>
    </div>
  );
}

export default SaveModal;
