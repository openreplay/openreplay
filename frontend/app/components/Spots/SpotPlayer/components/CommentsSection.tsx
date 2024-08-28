import { CloseOutlined } from '@ant-design/icons';
import { SendOutlined } from '@ant-design/icons';
import { Button, Input, Tooltip } from 'antd';
import cn from 'classnames';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { connect } from 'react-redux';
import { toast } from 'react-toastify';

import { resentOrDate } from 'App/date';
import { useStore } from 'App/mstore';

function CommentsSection({ onClose }: { onClose?: () => void }) {
  const { spotStore } = useStore();
  const comments = spotStore.currentSpot?.comments ?? [];
  return (
    <div
      className={'h-full p-4 bg-white border-l'}
      style={{ minWidth: 320, width: 320 }}
    >
      <div className={'flex items-center justify-between mb-2'}>
        <div className={'font-medium text-lg'}>Comments</div>
        <Button onClick={onClose} type="text" size="small">
          <CloseOutlined />
        </Button>
      </div>
      <div
        className={'overflow-y-auto flex flex-col gap-4 mt-2'}
        style={{ height: 'calc(100vh - 132px)' }}
      >
        {comments.map((comment) => (
          <div
            key={comment.createdAt}
            className={'flex flex-col gap-2 border-b border-dotted pb-2'}
          >
            <div className={'flex items-center gap-2'}>
              <div
                className={
                  'w-9 h-9 text-xs bg-tealx rounded-full flex items-center justify-center color-white uppercase'
                }
              >
                {comment.user[0]}
              </div>
              <div className={'font-medium flex flex-col '}>
                {comment.user}
                <div className={'text-xs text-disabled-text font-normal'}>
                  {resentOrDate(new Date(comment.createdAt).getTime())}
                </div>
              </div>
            </div>
            <div>{comment.text}</div>
          </div>
        ))}

        <BottomSectionContainer
          unloggedLimit={comments.length > 5}
          loggedLimit={comments.length > 25}
        />
      </div>
    </div>
  );
}

function BottomSection({
  loggedIn,
  userEmail,
  unloggedLimit,
  loggedLimit,
}: {
  loggedLimit: boolean;
  unloggedLimit: boolean;
  loggedIn?: boolean;
  userEmail?: string;
}) {
  const [commentText, setCommentText] = React.useState('');
  const [userName, setUserName] = React.useState<string>(userEmail ?? '');
  const { spotStore } = useStore();

  const addComment = async () => {
    try {
      await spotStore.addComment(
        spotStore.currentSpot!.spotId,
        commentText,
        userName
      );
      setCommentText('');
    } catch (e) {
      toast.error('Failed to add comment; Try again later');
    }
  };

  const unlogged = userName.trim().length === 0 && unloggedLimit
  const disableSubmit =
    commentText.trim().length === 0 ||
    unlogged || loggedLimit;
  return (
    <div
      className={cn(
        'mt-auto border-t	p-2',
        loggedIn ? 'bg-white' : 'bg-active-dark-blue'
      )}
    >
      <div className={'flex items-center gap-2'}>
        <div className={'flex flex-col w-full gap-2'}>
          <Input
            readOnly={loggedIn}
            disabled={loggedIn}
            placeholder={'Add a name'}
            required
            className={'w-full disabled:hidden'}
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
          />
          <Input.TextArea
            className={'w-full'}
            rows={3}
            autoSize={{ minRows: 3, maxRows: 3 }}
            maxLength={120}
            value={commentText}
            onChange={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setCommentText(e.target.value);
            }}
            placeholder="Add a comment..."
          />
        </div>
        <Tooltip
          title={
            !disableSubmit
              ? ''
              : unlogged ? 'Limited to 5 Messages. Join team to send more.' : 'Limited to 25 Messages.'
          }
        >
          <Button
            type={'primary'}
            onClick={addComment}
            disabled={disableSubmit}
            icon={<SendOutlined className="ps-0.5" />}
            shape={'circle'}
          />
        </Tooltip>
      </div>
    </div>
  );
}

function mapStateToProps(state: any) {
  const userEmail = state.getIn(['user', 'account', 'name']);
  const loggedIn = !!userEmail;
  return {
    userEmail,
    loggedIn,
  };
}

const BottomSectionContainer = connect(mapStateToProps)(BottomSection);

// const promoTitles = ['Found this Spot helpful?', 'Enjoyed this recording?'];
//
//   <div>
//     <div className={'text-xl'}>{promoTitles[0]}</div>
//     <div className={'my-2'}>
//       With Spot, capture issues and provide your team with detailed insights for frictionless experiences.
//     </div>
//     <Button>
//       Spot Your Issues Now
//     </Button>
//   </div>
// )}

export default observer(CommentsSection);
