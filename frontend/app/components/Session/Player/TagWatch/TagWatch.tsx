import { CopyOutlined } from '@ant-design/icons';
import { Button, Checkbox, Input, Segmented, Tooltip } from 'antd';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

import { useStore } from 'App/mstore';
import { sessions, withSiteId } from 'App/routes';
import { useHistory } from 'App/routing';
import { FilterKey } from 'App/types/filter/filterType';
import { addOptionsToFilter } from 'App/types/filter/newFilter';
import { PlayerContext } from 'Components/Session/playerContext';

interface CopyableTextAreaProps {
  selector: string;
  setSelector: (value: string) => void;
}

const CopyableTextArea: React.FC<CopyableTextAreaProps> = ({
  selector,
  setSelector,
}) => {
  const { t } = useTranslation();
  const handleCopy = () => {
    navigator.clipboard.writeText(selector);
  };

  return (
    <div className="w-full relative">
      <Input.TextArea
        value={selector}
        onChange={(e) => setSelector(e.target.value)}
        className="rounded-lg font-mono text-sm  placeholder:font-sans placeholder:text-base placeholder:text-gray-400"
        rows={3}
        style={{ paddingRight: '40px' }}
        placeholder={t('Enter selector to tag a feature. E.g. .btn-primary')}
      />
      <Tooltip title={t('Copy')}>
        <Button
          type="text"
          icon={<CopyOutlined />}
          onClick={handleCopy}
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            zIndex: 1,
          }}
        />
      </Tooltip>
    </div>
  );
};

function TagWatch() {
  const { t } = useTranslation();
  const { tagWatchStore, searchStore, projectsStore } = useStore();
  const [selector, setSelector] = React.useState('');
  const { store, player } = React.useContext(PlayerContext);
  const history = useHistory();

  const [name, setName] = React.useState('');
  const [ignoreClRage, setIgnoreClRage] = React.useState(false);
  const [ignoreDeadCl, setIgnoreDeadCl] = React.useState(false);
  const [scope, setScope] = React.useState<'entire' | 'location'>('entire');

  const { tagSelector, location: rawLocation } = store.get();

  const currentLocation = React.useMemo(() => {
    if (!rawLocation) return undefined;
    try {
      return new URL(rawLocation).pathname;
    } catch {
      return rawLocation;
    }
  }, [rawLocation]);

  React.useEffect(() => {
    player.pause();
    player.toggleInspectorMode(true);
    player.scale();

    return () => {
      player.toggleInspectorMode(false);
      player.scale();
    };
  }, []);

  React.useEffect(() => {
    if (tagSelector !== '' && tagSelector !== selector) {
      setSelector(tagSelector);
    }
  }, [tagSelector]);

  React.useEffect(() => {
    if (selector !== tagSelector) {
      player.markBySelector(selector);
    }
  }, [selector]);

  const locationValue = scope === 'location' ? currentLocation : undefined;

  const onSave = async () => {
    if (!name || !selector) return;
    try {
      const tag = await tagWatchStore.createTag({
        name,
        selector,
        ignoreClickRage: ignoreClRage,
        ignoreDeadClick: ignoreDeadCl,
        location: locationValue,
      });
      const tags = await tagWatchStore.getTags();
      if (tags) {
        addOptionsToFilter(
          FilterKey.TAGGED_ELEMENT,
          tags.map((tag) => ({ label: tag.name, value: tag.tagId.toString() })),
        );
      }
      toast.success(t('Feature created'));
      setSelector('');
      setName('');
      setIgnoreClRage(false);
      setIgnoreDeadCl(false);
      setScope('entire');
      return tag;
    } catch (e) {
      console.error(e);
      toast.error(t('Failed to create feature'));
    }
  };

  const saveAndOpen = () => {
    onSave().then((tagId) => {
      if (!tagId) return;
      const siteId = projectsStore.getSiteId() as unknown as string;
      searchStore.addFilterByKeyAndValue('tag', tagId.toString());
      history.push(withSiteId(sessions(), siteId));
    });
  };

  const canSave = name !== '' && selector !== '';

  return (
    <div className="w-full h-full p-4 flex flex-col gap-3 overflow-y-auto">
      <div>
        <div className="font-semibold text-sm mb-1">{t('Name')}</div>
        <Input
          placeholder="E.g Buy Now Button"
          className="w-full"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <p className="text-sm">
        {t(
          'Select elements in the session play area to tag as a feature and be able to find sessions where users interact with it.',
        )}
      </p>

      <CopyableTextArea selector={selector} setSelector={setSelector} />


      <div>
        <div className="font-semibold text-sm mb-1">
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
          <div className="font-semibold text-sm mb-1">{t('Scope')}</div>
          <Segmented
            size="small"
            value={scope}
            onChange={(val) => setScope(val as 'entire' | 'location')}
            options={[
              { label: t('Entire app'), value: 'entire' },
              { label: t('Use current location'), value: 'location' },
            ]}
          />
          {scope === 'location' && (
            <Input className="mt-2!" value={currentLocation} disabled />
          )}
        </div>
      ) : null}

      <div className="flex gap-2 mt-1">
        <Button type="primary" disabled={!canSave} onClick={onSave}>
          {t('Save Feature')}
        </Button>
      </div>
    </div>
  );
}

export default observer(TagWatch);
