import React, { useState } from 'react';
import copy from 'copy-to-clipboard';
import { Button } from 'antd';

function CopyButton({
  content,
  variant = 'text',
  className = 'capitalize mt-2 font-medium text-neutral-400',
  btnText = 'copy',
  size = 'small',
}) {
  const [copied, setCopied] = useState(false);

  const copyHandler = () => {
    setCopied(true);
    copy(content);
    setTimeout(() => {
      setCopied(false);
    }, 1000);
  };

  return (
    <Button
      type={variant}
      onClick={copyHandler}
      size={size}
      className={className}
    >
      {copied ? 'copied' : btnText}
    </Button>
  );
}

export default CopyButton;
