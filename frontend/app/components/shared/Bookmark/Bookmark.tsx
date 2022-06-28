import React, { useEffect, useState } from 'react'
import { Popup, Button, Icon } from 'UI'
import { toggleFavorite } from 'Duck/sessions'
import { connect } from 'react-redux'
import { toast } from 'react-toastify';
import { Tooltip } from 'react-tippy';
import cn from 'classnames';

interface Props {
  toggleFavorite: (sessionId: string) => Promise<void>;
  favorite: Boolean;
  sessionId: any;
  isEnterprise: Boolean;
  noMargin?: boolean;
}
function Bookmark(props : Props ) {
  const { sessionId, favorite, isEnterprise, noMargin } = props;
  const [isFavorite, setIsFavorite] = useState(favorite);
  const ADDED_MESSAGE = isEnterprise ? 'Session added to vault' : 'Session added to your bookmarks';
  const REMOVED_MESSAGE = isEnterprise ? 'Session removed from vault' : 'Session removed from your bookmarks';
  const TOOLTIP_TEXT_ADD = isEnterprise ? 'Add to vault' : 'Add to bookmarks';
  const TOOLTIP_TEXT_REMOVE = isEnterprise ? 'Remove from vault' : 'Remove from bookmarks';

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
      {noMargin ? (
        <div onClick={ toggleFavorite } className="flex items-center cursor-pointer">
          <Icon name={ isFavorite ? ACTIVE_ICON : INACTIVE_ICON } color={isFavorite ? "teal" : undefined} size="16" />
          <span className="ml-2">{isEnterprise ? 'Vault' : 'Bookmark'}</span>
        </div>
      ) : (
        <Button
          onClick={ toggleFavorite }
          data-favourite={ isFavorite }
        >
          <Icon name={ isFavorite ? ACTIVE_ICON : INACTIVE_ICON } color={isFavorite ? "teal" : undefined} size="16" />
          <span className="ml-2">{isEnterprise ? 'Vault' : 'Bookmark'}</span>
        </Button>
      )}
    </Popup>
  )
}

export default connect(state => ({
  isEnterprise: state.getIn([ 'user', 'account', 'edition' ]) === 'ee',
  favorite: state.getIn([ 'sessions', 'current', 'favorite']),
}), { toggleFavorite })(Bookmark)
