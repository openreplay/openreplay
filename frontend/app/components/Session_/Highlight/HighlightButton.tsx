import React from 'react'
import { Button, Tooltip } from 'antd';
import { MessageSquareQuote } from 'lucide-react'

function HighlightButton({ onClick }: { onClick: () => void }) {

  const openPanel = () => {
    onClick();
  }
  return (
    <Tooltip title={'Highlight a moment'} placement={'bottom'}>
      <Button onClick={openPanel} size={'small'}>
        <MessageSquareQuote size={14} strokeWidth={1} />
      </Button>
    </Tooltip>
  )
}

export default HighlightButton