import React from 'react';
import { TagInput, TagBadge } from 'UI';
import styles from './tagList.module.css';
import cn from 'classnames';

const TagList = ({
  tags, onRemove = null, onTagClick, className = '', style, outline = false,
  input = false, toggleTagEditor = null, tagEditorDisplayed = null, addTag = null,
}) => (
  <div className={ cn(styles.tagList, className)} style={ style } >
    { tags.map(tag => (
      <TagBadge
        key={ tag }
        text={ tag }
        onRemove={ onRemove ? () => onRemove(tag) : null }
        onClick={ onTagClick }
        outline={ outline }
      />
    ))}
    { input &&
      <TagInput
        toggleTagEditor={ toggleTagEditor }
        tagEditorDisplayed={ tagEditorDisplayed }
        addTag={ addTag }
      />
    }
  </div>
);

TagList.displayName = 'TagList';

export default TagList;
