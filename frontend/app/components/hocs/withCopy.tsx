import React from 'react';
import copy from 'copy-to-clipboard';
import { Tooltip } from 'UI';
import { useTranslation } from 'react-i18next';

const withCopy = (WrappedComponent: React.ComponentType) => {
  function ComponentWithCopy(props: any) {
    const { t } = useTranslation();
    const [copied, setCopied] = React.useState(false);
    const { value, tooltip } = props;
    const copyToClipboard = (text: string) => {
      copy(text);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 1000);
    };
    return (
      <div
        onClick={() => copyToClipboard(value)}
        className="w-fit cursor-pointer"
      >
        <Tooltip title={copied ? tooltip : t('Click to copy')} delay={0}>
          <WrappedComponent {...props} copyToClipboard={copyToClipboard} />
        </Tooltip>
      </div>
    );
  }
  return ComponentWithCopy;
};

export default withCopy;
