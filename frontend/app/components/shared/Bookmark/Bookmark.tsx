//@ts-nocheck
import React, { useEffect, useState } from 'react'
import stl from './bookmark.css'
import { Icon } from 'UI'
import { toggleFavorite } from 'Duck/sessions'
import { connect } from 'react-redux'
import { toast } from 'react-toastify';
import { Tooltip } from 'react-tippy';

interface Props {
  toggleFavorite: (sessionId: string) => Promise<void>,
  favorite: Boolean,
  sessionId: any,
  isEnterprise: Boolean
}
function Bookmark(props : Props ) {  
  const { sessionId, favorite, isEnterprise } = props;
  const [isFavorite, setIsFavorite] = useState(favorite);
  const ADDED_MESSAGE = isEnterprise ? 'Session added to vault' : 'Session added to your favorites';
  const REMOVED_MESSAGE = isEnterprise ? 'Session removed from vault' : 'Session removed from your favorites';  
  const TOOLTIP_TEXT_ADD = isEnterprise ? 'Add to vault' : 'Add to favorites';
  const TOOLTIP_TEXT_REMOVE = isEnterprise ? 'Remove from vault' : 'Remove from favorites';

  const ACTIVE_ICON = isEnterprise ? 'safe-fill' : 'star-solid';
  const INACTIVE_ICON = isEnterprise ? 'safe' : 'star';


  useEffect(() => {
    setIsFavorite(favorite);
  }, [favorite]);

  const toggleFavorite = async () => {
    props.toggleFavorite(sessionId).then(() => {
      toast.success(isFavorite ? REMOVED_MESSAGE : ADDED_MESSAGE);
      setIsFavorite(!isFavorite);
    });
  }

  return (
    <Tooltip 
      delay={500}
      arrow
      title={isFavorite ? TOOLTIP_TEXT_REMOVE : TOOLTIP_TEXT_ADD}
      hideOnClick={true}
    >
      <div
        className={ stl.favoriteWrapper }
        onClick={ toggleFavorite }
        data-favourite={ isFavorite }
      >
        <Icon name={ isFavorite ? ACTIVE_ICON : INACTIVE_ICON } color="teal" size="20" />
      </div>
    </Tooltip>
  )
}

export default connect(state => ({
  isEnterprise: state.getIn([ 'user', 'client', 'edition' ]) === 'ee',
}), { toggleFavorite })(Bookmark)
