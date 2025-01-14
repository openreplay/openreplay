import React from 'react'
import { useState } from 'react';
import copy from 'copy-to-clipboard';
import { Button } from 'antd';

function CopyButton({ content, variant="text-primary",  className = '', btnText = 'copy' }) {
  const [copied, setCopied] = useState(false)

  const copyHandler = () => {
    setCopied(true);
    copy(content);
    setTimeout(() => {
      setCopied(false);
    }, 1000);
  };
  
  return (
    <Button
      type='text'
      onClick={ copyHandler }
      size='small'
      className='capitalize mt-2 font-medium text-neutral-400'
    >
      { copied ? 'copied' : btnText }
    </Button>
  )
}

export default CopyButton
