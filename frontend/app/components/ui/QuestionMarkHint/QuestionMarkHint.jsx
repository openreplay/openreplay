import React from 'react';
import cn from 'classnames';
import Icon from '../Icon';
import Tooltip from '../Tooltip';

export default function QuestionMarkHint({ content, ...props }) {
  return (
    <Tooltip title={content} {...props}>
      <Icon name="question-circle" size="18" className={cn('cursor-pointer')} />
    </Tooltip>
  );
}
