import { X } from 'lucide-react';
import React from 'react';
import cn from 'classnames';
import { Button, Input } from 'antd';
import { resentOrDate } from 'App/date';
import { SpotComment } from 'App/services/spotService';
import { useStore } from "App/mstore";

function CommentsSection({
  comments,
  onClose,
}: {
  comments: SpotComment[];
  onClose?: () => void;
}) {
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

        <BottomSection loggedIn />
      </div>
    </div>
  );
}

function BottomSection({ loggedIn }: { loggedIn?: boolean }) {
  const promoTitles = ['Found this Spot helpful?', 'Enjoyed this recording?']
  const [commentText, setCommentText] = React.useState('')
  const { spotStore } = useStore()

  const addComment = async () => {
    await spotStore.addComment(spotStore.currentSpot!.spotId, commentText, "ochen umni uzer")
    setCommentText('')
  }
  return (
    <div className={cn('rounded-xl border p-4 mt-auto', loggedIn ? 'bg-white' : 'bg-active-dark-blue')}>
      {loggedIn ? (
        <div className={'flex flex-col gap-2'}>
          <Input.TextArea
            className={'w-full'}
            rows={3}
            autoSize={{ minRows: 3, maxRows: 3 }}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
          />
          <Button type={'primary'} onClick={addComment} disabled={commentText.trim().length === 0}>Add Comment</Button>
        </div>
      ) : (
        <div>
          <div className={'text-xl'}>{promoTitles[0]}</div>
          <div className={'my-2'}>
            With Spot, capture issues and provide your team with detailed insights for frictionless experiences.
          </div>
          <Button>
            Spot Your Issues Now
          </Button>
        </div>
      )}
    </div>
  )
}

export default CommentsSection;
