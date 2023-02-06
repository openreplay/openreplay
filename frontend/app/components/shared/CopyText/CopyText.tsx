import React, { useState } from 'react';
import { Tooltip } from 'UI';
import copy from 'copy-to-clipboard';

interface Props {
  label?: string;
  afterLabel?: string;
  children: any;
  content: string;
}
function CopyText(props: Props) {
  const { children, label = 'Click to copy', afterLabel = 'Copied', content = '' } = props;
  const [isCopied, setIsCopied] = useState(false);
  const onClick = () => {
    copy(content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 5000);
  };
  return (
    <Tooltip delay={0} title={isCopied ? afterLabel : label}>
      <span onClick={onClick}>{children}</span>
    </Tooltip>
  );
}

export default CopyText;
