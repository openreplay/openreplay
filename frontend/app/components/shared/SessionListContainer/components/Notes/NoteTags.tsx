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

function NoteTags() {
  const { notesStore } = useStore()
  const defaultOption = sortOptions[0].value;

  return (
    <div className="flex items-center">
      {TAGS.map((tag: iTag) => (
        <div key={tag}>
          <TagItem
            onClick={() => notesStore.toggleTag(tag)}
            label={tag}
            isActive={notesStore.activeTags.includes(tag)}
          />
        </div>
      ))}

      <Select name="sortSessions" plain right options={sortOptions} onChange={({ value }) => notesStore.toggleSort(value.value)} defaultValue={defaultOption} />
    </div>
  );
}

export default observer(NoteTags);
