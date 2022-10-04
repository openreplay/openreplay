import React from 'react';
import Select from 'Shared/Select';
import { TAGS, iTag } from 'App/services/NotesService';
import { TagItem } from '../SessionTags';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';

const sortOptionsMap = {
  'createdAt-DESC': 'Newest',
  'createdAt-ASC': 'Oldest',
};
const sortOptions = Object.entries(sortOptionsMap).map(([value, label]) => ({ value, label }));
const notesOwner = [{ value: '0', label: 'All Notes'},{ value: '1', label: 'My Notes'}]
function NoteTags() {
  const { notesStore } = useStore()


  return (
    <div className="flex items-center">
        <div>
          <TagItem
            onClick={() => notesStore.toggleTag()}
            label="ALL"
            isActive={notesStore.activeTags.length === 0}
          />
        </div>
      {TAGS.map((tag: iTag) => (
        <div key={tag}>
          <TagItem
            onClick={() => notesStore.toggleTag(tag)}
            label={tag}
            isActive={notesStore.activeTags.includes(tag)}
          />
        </div>
      ))}
      <div className="ml-2" />
      <Select name="sortNotes" plain right options={sortOptions} onChange={({ value }) => notesStore.toggleSort(value.value)} defaultValue={sortOptions[0].value} />
      <div className="ml-2" />
      <Select name="notesOwner" plain right options={notesOwner} onChange={({ value }) => notesStore.toggleShared(value.value === '1')} defaultValue={notesOwner[0].value} />
    </div>
  );
}

export default observer(NoteTags);
