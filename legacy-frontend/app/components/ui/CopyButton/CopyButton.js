import React from 'react'
import { useState } from 'react';
import copy from 'copy-to-clipboard';
import { Button } from 'UI';

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
      variant={variant}
      className={ className + ' capitalize' }
      onClick={ copyHandler }
    >
      { copied ? 'copied' : btnText }
    </Button>
  )
}

export default CopyButton
