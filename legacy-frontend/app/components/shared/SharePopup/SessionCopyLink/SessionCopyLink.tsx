import React from 'react';
import { Button } from 'antd';
import { LinkOutlined } from '@ant-design/icons';

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
      <Button type="text" onClick={copyHandler} icon={<LinkOutlined />}>
        Copy URL at Current Time
      </Button>
      {copied && <div className="color-gray-medium">Copied</div>}
    </div>
  );
}

export default SessionCopyLink;
