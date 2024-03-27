import React from 'react';
import { Button, Icon } from 'UI';
import copy from 'copy-to-clipboard';

function SessionCopyLink({ time }: { time: number }) {
  const [copied, setCopied] = React.useState(false);

  const copyHandler = () => {
    setCopied(true);
    copy(
      window.location.origin
      + window.location.pathname
      + '?jumpto='
      + Math.round(time)
    );
    setTimeout(() => {
      setCopied(false);
    }, 1000);
  };

  return (
    <div className="flex justify-between items-center w-full mt-2">
      <Button variant="text-primary" onClick={copyHandler}>
        <>
          <Icon name="link-45deg" className="mr-2" color="teal" size="18" />
          <span>Copy URL at current time</span>
        </>
      </Button>
      {copied && <div className="color-gray-medium">Copied</div>}
    </div>
  );
}

export default SessionCopyLink;
