import React, { useState } from 'react'
import { List } from 'immutable'
import { Avatar, TextEllipsis, SlideModal } from 'UI'
import cn from 'classnames'
import Metadata from '../Metadata'
import { withRequest } from 'HOCs'
import SessionList from '../Metadata/SessionList'

function UserCard({ className, userNumericHash, userDisplayName, similarSessions, userId, userAnonymousId, request, loading, revId }) {
  const [showUserSessions, setShowUserSessions] = useState(false)
  const hasUserDetails = !!userId || !!userAnonymousId;

  const showSimilarSessions = () => {
    setShowUserSessions(true);
    request({ key: !userId ? 'USERANONYMOUSID' : 'USERID', value: userId || userAnonymousId });
  }

  return (
    <div className={cn("bg-white rounded border", className)}>
      <div className={ cn("flex items-center p-3")}>
        <Avatar iconSize="36" width="50px" height="50px" seed={ userNumericHash } />
        <div className="ml-3 overflow-hidden leading-tight">
          <TextEllipsis
            noHint
            className={ cn("text-xl", { 'color-teal cursor-pointer' : hasUserDetails })}
            onClick={hasUserDetails && showSimilarSessions}
          >
            { userDisplayName }
          </TextEllipsis>
        </div>
      </div>
      {revId && (
        <div className="border-t py-2 px-3">
          RevId: {revId}
        </div>
      )}
      <div className="border-t">
        <Metadata />
      </div>
      <SlideModal
        title={ <div>User Sessions</div> }
        isDisplayed={ showUserSessions }
        content={ showUserSessions && <SessionList similarSessions={ similarSessions } loading={ loading } /> }
        onClose={ () => showUserSessions ? setShowUserSessions(false) : null }
      />
    </div>
  )
}

export default withRequest({
	initialData: List(),
	endpoint: '/metadata/session_search',
	dataWrapper: data => Object.values(data),
	dataName: 'similarSessions',
})(UserCard)
