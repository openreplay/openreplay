import React from 'react'
import { SpotComment } from "App/services/spotService";

function CommentsSection({ comments }: { comments: SpotComment[] }) {
  return (
    <div className={'h-full p-4 bg-white border border-gray-light'} style={{ width: 220 }}>
      <div className={'flex items-center justify-between'}>
        <div className={'font-semibold'}>Comments</div>
        <div>x</div>
      </div>
      {comments.map((comment) => (
        <div key={comment.createdAt} className={'my-4'}>
          <div className={'flex items-center gap-2'}>
            <div>S</div>
            <div>{comment.user}</div>
          </div>
          <div>{comment.text}</div>
          <div>{comment.createdAt}</div>
        </div>
      ))}
    </div>
  )
}

export default CommentsSection