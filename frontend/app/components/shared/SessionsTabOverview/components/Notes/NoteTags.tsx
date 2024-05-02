import { Segmented } from 'antd';
import { observer } from 'mobx-react-lite';
import React from 'react';

import { useStore } from 'App/mstore';
import { TAGS, iTag } from 'App/services/NotesService';
import { SortDropdown } from '../SessionSort/SessionSort';

const sortOptionsMap = {
  'createdAt-DESC': 'Newest',
  'createdAt-ASC': 'Oldest',
};
const sortOptions = Object.entries(sortOptionsMap).map(([value, label]) => ({
  value,
  label,
}));
const notesOwner = [
  { value: '0', label: 'All Notes' },
  { value: '1', label: 'My Notes' },
];
function toTitleCase(str) {
  return str.replace(/\w\S*/g, function (txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}
function NoteTags() {
  const { notesStore } = useStore();

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
                All
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
        onChange={(value: iTag) => notesStore.toggleTag(value === 'ALL' ? undefined : value)}
      />
      <div className="ml-auto" />
      <SortDropdown
        sortOptions={notesOwner.map(({ value, label }) => ({
          key: value,
          label,
        }))}
        onSort={({ key }) => {
          notesStore.toggleShared(key === '1');
        }}
        current={notesStore.ownOnly ? notesOwner[1].label : notesOwner[0].label}
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
        current={notesStore.order === 'DESC' ? 'Newest' : 'Oldest'}
      />
    </div>
  );
}

export default observer(NoteTags);
