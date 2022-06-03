import React, { useEffect, useState } from 'react'
import { Popup, Button } from 'UI'
import { toggleFavorite } from 'Duck/sessions'
import { connect } from 'react-redux'
import { toast } from 'react-toastify';

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
    <Popup 
      delay={500}
      content={isFavorite ? TOOLTIP_TEXT_REMOVE : TOOLTIP_TEXT_ADD}
      hideOnClick={true}
      distance={20}
    >
      <Button
        onClick={ toggleFavorite }
        variant="text-primary"
        icon={isFavorite ? ACTIVE_ICON : INACTIVE_ICON}
      />
    </Popup>
  )
}

export default connect(state => ({
  isEnterprise: state.getIn([ 'user', 'client', 'edition' ]) === 'ee',
}), { toggleFavorite })(Bookmark)
