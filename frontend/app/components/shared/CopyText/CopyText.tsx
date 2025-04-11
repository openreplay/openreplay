import React, { useState } from 'react';
import { Tooltip } from 'antd';
import copy from 'copy-to-clipboard';
import { useTranslation } from 'react-i18next';

interface Props {
  label?: string;
  afterLabel?: string;
  children: any;
  content: string;
}
function CopyText(props: Props) {
  const { t } = useTranslation();
  const {
    children,
    label = t('Click to copy'),
    afterLabel = t('Copied'),
    content = '',
  } = props;
  const [isCopied, setIsCopied] = useState(false);
  const onClick = () => {
    copy(content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 5000);
  };
  return (
    <Tooltip title={isCopied ? afterLabel : label} placement="top">
      <span onClick={onClick}>{children}</span>
    </Tooltip>
  );
}

export default CopyText;
