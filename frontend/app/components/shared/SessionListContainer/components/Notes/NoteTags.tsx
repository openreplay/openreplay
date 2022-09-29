import React from 'react';
import { TAGS, iTag } from 'App/services/NotesService';
import { TagItem } from '../SessionTags';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';

function NoteTags() {
  const { notesStore } = useStore()

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
    </div>
  );
}

export default observer(NoteTags);
