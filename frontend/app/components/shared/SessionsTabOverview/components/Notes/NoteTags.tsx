import { Segmented } from 'antd';
import { observer } from 'mobx-react-lite';
import React from 'react';

import { useStore } from 'App/mstore';
import { TAGS, iTag } from 'App/services/NotesService';
import { SortDropdown } from '../SessionSort/SessionSort';
import { useTranslation } from 'react-i18next';
import { TFunction } from 'i18next';

const sortOptionsMap = (t: TFunction) => ({
  'createdAt-DESC': t('Newest'),
  'createdAt-ASC': t('Oldest'),
});
const sortOptions = Object.entries(sortOptionsMap).map(([value, label]) => ({
  value,
  label,
}));

const notesOwner = (t: TFunction) => [
  { value: '0', label: t('All Notes') },
  { value: '1', label: t('My Notes') },
];

function toTitleCase(str) {
  return str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(),
  );
}
function NoteTags() {
  const { notesStore } = useStore();
  const { t } = useTranslation();

  return (
    <div className="flex items-center w-full">
      <Segmented
        size="small"
        options={[
          {
            value: 'ALL',
            label: (
              <div
                className={
                  notesStore.activeTags.includes('ALL') ||
                  notesStore.activeTags.length === 0
                    ? 'text-main'
                    : ''
                }
              >
                {t('All')}
              </div>
            ),
          },
          ...TAGS.map((tag: iTag) => ({
            value: tag,
            label: (
              <div
                className={
                  notesStore.activeTags.includes(tag) ? 'text-main' : ''
                }
              >
                {toTitleCase(tag)}
              </div>
            ),
          })),
        ]}
        onChange={(value: iTag) =>
          notesStore.toggleTag(value === 'ALL' ? undefined : value)
        }
      />
      <div className="ml-auto" />
      <SortDropdown
        sortOptions={notesOwner(t).map(({ value, label }) => ({
          key: value,
          label,
        }))}
        onSort={({ key }) => {
          notesStore.toggleShared(key === '1');
        }}
        current={
          notesStore.ownOnly ? notesOwner(t)[1].label : notesOwner(t)[0].label
        }
      />
      <div className="ml-2 w-2" />
      <SortDropdown
        sortOptions={sortOptions.map(({ value, label }) => ({
          key: value,
          label,
        }))}
        onSort={({ key }) => {
          notesStore.toggleSort(key);
        }}
        current={notesStore.order === 'DESC' ? t('Newest') : t('Oldest')}
      />
    </div>
  );
}

export default observer(NoteTags);
