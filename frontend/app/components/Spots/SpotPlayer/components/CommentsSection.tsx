import { Button, Input, Tooltip } from 'antd';
import cn from 'classnames';
import { X } from 'lucide-react';
import React from 'react';
import { connect } from 'react-redux';
import { resentOrDate } from 'App/date';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { SendOutlined } from '@ant-design/icons';

function CommentsSection({
  onClose,
}: {
  onClose?: () => void;
}) {
  const { spotStore } = useStore();
  const comments = spotStore.currentSpot?.comments ?? [];
  return (
    <div
      className={'h-full p-4 bg-white border border-gray-light'}
      style={{ minWidth: 320, width: 320 }}
    >
      <div className={'flex items-center justify-between'}>
        <div className={'font-semibold'}>Comments</div>
        <div onClick={onClose} className={'p-1 cursor-pointer'}>
          <X size={16} />
        </div>
      </div>
      <div
        className={'overflow-y-auto flex flex-col gap-4 mt-2'}
        style={{ height: 'calc(100vh - 132px)' }}
      >
        {comments.map((comment) => (
          <div key={comment.createdAt} className={'flex flex-col gap-2'}>
            <div className={'flex items-center gap-2'}>
              <div
                className={
                  'w-8 h-8 bg-tealx rounded-full flex items-center justify-center color-white uppercase'
                }
              >
                {comment.user[0]}
              </div>
              <div className={'font-semibold'}>{comment.user}</div>
            </div>
            <div>{comment.text}</div>
            <div className={'text-disabled-text'}>
              {resentOrDate(new Date(comment.createdAt).getTime())}
            </div>
          </div>
        ))}

        <BottomSectionContainer disableComments={comments.length > 5} />
      </div>
    </div>
  );
}

function BottomSection({ loggedIn, userEmail, disableComments }: { disableComments: boolean, loggedIn?: boolean, userEmail?: string }) {
  const [commentText, setCommentText] = React.useState('');
  const [userName, setUserName] = React.useState<string>(userEmail ?? '');
  const { spotStore } = useStore();

  const addComment = async () => {
    await spotStore.addComment(
      spotStore.currentSpot!.spotId,
      commentText,
      userName
    );
    setCommentText('');
  };

  const disableSubmit = commentText.trim().length === 0 || userName.trim().length === 0 || disableComments
  return (
    <div
      className={cn(
        'rounded-xl border p-4 mt-auto',
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
          className={'w-full'}
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
        />
        <Input.TextArea
          className={'w-full'}
          rows={3}
          autoSize={{ minRows: 3, maxRows: 3 }}
          maxLength={120}
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
        />
      </div>
        <Tooltip title={!disableComments ? "" : "Limited to 5 Messages. Join team to send more."}>
          <Button
            type={'primary'}
            onClick={addComment}
            disabled={disableSubmit}
            icon={<SendOutlined />}
            shape={"circle"}
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
