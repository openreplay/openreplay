import React, { useState } from 'react';
import { Tooltip } from 'react-tippy';
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
    // @ts-ignore
    <Tooltip
      delay={0}
      arrow
      animation="fade"
      hideOnClick={false}
      title={isCopied ? afterLabel : label}
    >
      <span onClick={onClick}>{children}</span>
    </Tooltip>
  );
}

export default CopyText;
