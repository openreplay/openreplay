import React from 'react'
import { Icon } from 'UI'
import PlayLink from 'Shared/SessionItem/PlayLink'

enum Tags {
  QUERY,
  ISSUE,
  TASK,
  OTHER
}

interface Props {
  author: string
  timestamp: number
  tags: string[]
  isPrivate: boolean
  description: string
  sessionId: string
}

function NoteItem(props: Props) {

  return (
     <div className="flex items-center p-4 border-b hover:backdrop-opacity-25" style={{ background: 'rgba(253, 243, 155, 0.1)' }}>
        <div className="flex flex-col">
          <div>{props.description}</div>
          <div className="flex items-center gap-2">
            <div>{props.tags}</div>
            <div className='text-disabled-text flex items-center'>
            <span className="text-figmaColors-text-primary mr-1">By </span>
              {props.author}, {props.timestamp}
              {props.isPrivate ? null : (
              <>
                <Icon name="user-friends" className="ml-4 mr-1" color="gray-dark" /> Team
              </>
            )}
            </div>
          </div>
        </div>
        <div className="ml-auto"><PlayLink isAssist={false} viewed={false} sessionId={props.sessionId} queryParams="noteurlparams" /></div>
        <div className="ml-2 cursor-pointer"><Icon name="ellipsis-v" size={20} /></div>
     </div>
  )
}

export default NoteItem
