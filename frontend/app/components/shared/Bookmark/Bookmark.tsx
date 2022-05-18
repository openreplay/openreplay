import React, { useState } from 'react'
import stl from './bookmark.css'
import { Icon } from 'UI'
import { toggleFavorite } from 'Duck/sessions'
import { connect } from 'react-redux'
// import Session from 'Types/session';

interface Props {
  toggleFavorite: (session) => void,
  favorite: Boolean,
  sessionId: any
}
function Bookmark({ toggleFavorite, sessionId, favorite } : Props ) {  

  return ( 
    <div
      className={ stl.favoriteWrapper }
      onClick={ () => toggleFavorite(sessionId) }
      data-favourite={ favorite }
    >
      <Icon name={ favorite ? 'star-solid' : 'star' } size="20" />
    </div>
  )
}

export default connect(null, { toggleFavorite })(Bookmark)
