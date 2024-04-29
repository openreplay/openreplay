import React, { useEffect, useState } from 'react';
import { toggleFavorite } from 'Duck/sessions';
import { connect } from 'react-redux';
import { toast } from 'react-toastify';
import { Button, Popover } from 'antd'
import { Vault } from 'lucide-react'

interface Props {
  toggleFavorite: (sessionId: string) => Promise<void>;
  favorite: boolean;
  sessionId: any;
  isEnterprise: boolean;
  noMargin?: boolean;
}
function Bookmark(props: Props) {
  const { sessionId, favorite, isEnterprise, noMargin } = props;
  const [isFavorite, setIsFavorite] = useState(favorite);
  const ADDED_MESSAGE = isEnterprise ? 'Session added to vault' : 'Session added to your bookmarks';
  const REMOVED_MESSAGE = isEnterprise
    ? 'Session removed from vault'
    : 'Session removed from your bookmarks';
  const TOOLTIP_TEXT_ADD = isEnterprise ? 'Add to vault' : 'Add to bookmarks';
  const TOOLTIP_TEXT_REMOVE = isEnterprise ? 'Remove from vault' : 'Remove from bookmarks';

  useEffect(() => {
    setIsFavorite(favorite);
  }, [favorite]);

  const toggleFavorite = async () => {
    props.toggleFavorite(sessionId).then(() => {
      toast.success(isFavorite ? REMOVED_MESSAGE : ADDED_MESSAGE);
      setIsFavorite(!isFavorite);
    });
  };

  return (
    <div onClick={toggleFavorite} className="w-full">
      <Popover content={isFavorite ? TOOLTIP_TEXT_REMOVE : TOOLTIP_TEXT_ADD}>
          <Button type={isFavorite ? 'primary' : undefined} ghost={isFavorite} size={'small'} className={'flex items-center justify-center'}>
            <Vault size={16} strokeWidth={1} />
          </Button>
      </Popover>
    </div>
  );
}

export default connect(
  (state: any) => ({
    isEnterprise: state.getIn(['user', 'account', 'edition']) === 'ee',
    favorite: state.getIn(['sessions', 'current']).favorite,
  }),
  { toggleFavorite }
)(Bookmark);
