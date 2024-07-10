import React from 'react'
import { SpotComment } from "App/services/spotService";
import { X } from 'lucide-react'
import { resentOrDate } from "App/date";

function CommentsSection({ comments, onClose }: { comments: SpotComment[], onClose?: () => void }) {
  return (
    <div className={'h-full p-4 bg-white border border-gray-light'} style={{ width: 220 }}>
    <div className={'flex items-center justify-between'}>
        <div className={'font-semibold'}>Comments</div>
        <div onClick={onClose} className={'p-1 cursor-pointer'}>
          <X size={16} />
        </div>
      </div>
      {comments.map((comment) => (
        <div key={comment.createdAt} className={'my-4 flex flex-col gap-2'}>
          <div className={'flex items-center gap-2'}>
            <div
              className={'w-8 h-8 bg-tealx rounded-full flex items-center justify-center color-white uppercase'}
            >
              {comment.user[0]}
            </div>
            <div className={'font-semibold'}>{comment.user}</div>
          </div>
          <div>{comment.text}</div>
          <div className={'text-disabled-text'}>{resentOrDate(new Date(comment.createdAt).getTime())}</div>
        </div>
      ))}
    </div>
  )
}

export default CommentsSection