import React from 'react';
import { Button, Tooltip } from 'antd';
import { MessageSquareQuote } from 'lucide-react';
import { Icon } from 'UI';
import { useTranslation } from 'react-i18next';

function HighlightButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();
  const openPanel = () => {
    onClick();
  };
  return (
    <Tooltip title={t('Highlight a moment')} placement="bottom">
      <Button onClick={openPanel} size="small">
        <Icon name="chat-square-quote" color="inherit" size={15} />
      </Button>
    </Tooltip>
  );
}

export default HighlightButton;
