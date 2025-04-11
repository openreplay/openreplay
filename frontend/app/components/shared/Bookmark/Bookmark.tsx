import { Button, Tooltip } from 'antd';
import { BookmarkCheck, Bookmark as BookmarkIcn, Vault } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';

interface Props {
  sessionId: any;
}

function Bookmark({ sessionId }: Props) {
  const { sessionStore, userStore } = useStore();
  const { isEnterprise } = userStore;
  const { favorite } = sessionStore.current;
  const onToggleFavorite = sessionStore.toggleFavorite;
  const [isFavorite, setIsFavorite] = useState(favorite);

  const ADDED_MESSAGE = isEnterprise
    ? 'Session added to vault'
    : 'Session added to your bookmarks';
  const REMOVED_MESSAGE = isEnterprise
    ? 'Session removed from vault'
    : 'Session removed from your bookmarks';
  const TOOLTIP_TEXT_ADD = isEnterprise ? 'Add to vault' : 'Add to bookmarks';
  const TOOLTIP_TEXT_REMOVE = isEnterprise
    ? 'Remove from vault'
    : 'Remove from bookmarks';

  useEffect(() => {
    setIsFavorite(favorite);
  }, [favorite]);

  const toggleFavorite = async () => {
    onToggleFavorite(sessionId).then(() => {
      toast.success(isFavorite ? REMOVED_MESSAGE : ADDED_MESSAGE);
      setIsFavorite(!isFavorite);
    });
  };

  const icon = isEnterprise ? (
    <Vault size={16} strokeWidth={1} />
  ) : isFavorite ? (
    <BookmarkCheck size={16} strokeWidth={1} />
  ) : (
    <BookmarkIcn size={16} strokeWidth={1} />
  );

  return (
    <div onClick={toggleFavorite} className="w-full">
      <Tooltip
        title={isFavorite ? TOOLTIP_TEXT_REMOVE : TOOLTIP_TEXT_ADD}
        placement="bottom"
      >
        <Button
          type={isFavorite ? 'primary' : undefined}
          ghost={isFavorite}
          size="small"
          className="flex items-center justify-center"
        >
          {icon}
        </Button>
      </Tooltip>
    </div>
  );
}

export default observer(Bookmark);
