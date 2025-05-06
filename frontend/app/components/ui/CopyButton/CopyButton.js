import React, { useState } from 'react';
import copy from 'copy-to-clipboard';
import { Button, Tooltip } from 'antd';
import { ClipboardCopy, ClipboardCheck } from 'lucide-react';

function CopyButton({
  content,
  variant = 'text',
  className = 'capitalize mt-2 font-medium text-neutral-400',
  btnText = 'copy',
  size = 'small',
  isIcon = false,
}) {
  const [copied, setCopied] = useState(false);

  const copyHandler = () => {
    setCopied(true);
    copy(content);
    setTimeout(() => {
      setCopied(false);
    }, 1000);
  };

  if (isIcon) {
    return (
      <Tooltip title={copied ? 'Copied!' : 'Copy'}>
        <Button
          type="text"
          onClick={copyHandler}
          size={size}
          icon={
            copied ? <ClipboardCheck size={16} /> : <ClipboardCopy size={16} />
          }
        />
      </Tooltip>
    );
  }
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
