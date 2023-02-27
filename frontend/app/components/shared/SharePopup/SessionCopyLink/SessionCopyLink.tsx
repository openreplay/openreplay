import React from 'react';
import { Button, Icon } from 'UI';
import copy from 'copy-to-clipboard';
import { PlayerContext } from 'App/components/Session/playerContext';
import { observer } from 'mobx-react-lite';

function SessionCopyLink() {
  const [copied, setCopied] = React.useState(false);
  const { store } = React.useContext(PlayerContext)

  const time = store.get().time

  const copyHandler = () => {
    setCopied(true);
    copy(window.location.origin + window.location.pathname + '?jumpto=' + Math.round(time));
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

export default observer(SessionCopyLink);
