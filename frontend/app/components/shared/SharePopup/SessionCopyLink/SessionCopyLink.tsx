import React from 'react';
import { connect } from 'react-redux';
import { Button, Icon } from 'UI';
import copy from 'copy-to-clipboard';
import { PlayerContext } from 'App/components/Session/playerContext';
import { observer } from 'mobx-react-lite';
import { DateTime } from 'luxon';

function SessionCopyLink({ startedAt }: any) {
  const [copied, setCopied] = React.useState(false);
  const { store } = React.useContext(PlayerContext);
  const time = store.get().time;

  const copyHandler = () => {
    setCopied(true);
    const timeStr = DateTime.fromMillis(startedAt + time);
    copy(window.location.origin + window.location.pathname + '?jumpto=' + parseInt(String(timeStr.toMillis())));
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

export default connect((state: any) => {
  return {
    time: state.time,
    startedAt: state.getIn(['sessions', 'current']).startedAt || 0,
  };
})(observer(SessionCopyLink));
