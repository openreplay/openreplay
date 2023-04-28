import React from 'react';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import cn from 'classnames';
import SectionTitle from './SectionTitle';

function Comments() {
  const { bugReportStore } = useStore();
  const inputRef = React.createRef<HTMLTextAreaElement>();

  const toggleEdit = () => {
    bugReportStore.toggleCommentEditing(true);
  };

  React.useEffect(() => {
    if (inputRef.current && bugReportStore.isCommentEdit) {
      inputRef.current?.focus();
    }
  }, [bugReportStore.isCommentEdit]);

  const commentsEnabled = bugReportStore.comment.length > 0;
  const commentStr = commentsEnabled
    ? bugReportStore.comment
    : 'Expected results, additional steps or any other useful information for debugging.';

  return (
    <div className="w-full" id={commentsEnabled ? '' : 'pdf-ignore'}>
      <div className="flex items-center gap-2">
        <SectionTitle>Comments</SectionTitle>
        <div className="text-disabled-text mb-2">(Optional)</div>
      </div>
      {bugReportStore.isCommentEdit ? (
        <textarea
          ref={inputRef}
          name="reportComments"
          placeholder="Comment..."
          rows={3}
          autoFocus
          className="text-area fluid border -mx-2 px-2 py-1 w-full -mt-2"
          value={bugReportStore.comment}
          onChange={(e) => bugReportStore.setComment(e.target.value)}
          onBlur={() => bugReportStore.toggleCommentEditing(false)}
          onFocus={() => bugReportStore.toggleCommentEditing(true)}
        />
      ) : (
        <div
          onClick={toggleEdit}
          className={cn(
            !commentsEnabled
              ? 'text-disabled-text border-dotted border-gray-medium'
              : 'border-b-borderColor-transparent hover:border-dotted hover:border-gray-medium',
            'pt-1 w-fit -mt-2',
            'cursor-pointer select-none border-b'
          )}
        >
          {commentStr}
        </div>
      )}
    </div>
  );
}

export default observer(Comments);
