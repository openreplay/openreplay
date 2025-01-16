import React from 'react';
import { Button, Tooltip } from '.store/antd-virtual-7db13b4af6/package';
import Session from 'Types/session';
import UserCard from 'Components/Session/Player/ClipPlayer/UserCard';
import QueueControls from 'Components/Session/Player/ClipPlayer/QueueControls';
import { App, Space } from 'antd';
import copy from 'copy-to-clipboard';
import { withSiteId } from '@/routes';
import * as routes from '@/routes';
import { useStore } from '@/mstore';
import { LinkIcon, X } from 'lucide-react';

interface Props {
  session: Session;
  range: [number, number];
  onClose?: () => void;
  isHighlight?: boolean;
}

function ClipPlayerHeader(props: Props) {
  const { projectsStore } = useStore();
  const { session, range, onClose, isHighlight } = props;
  const siteId = projectsStore.siteId;
  const { message } = App.useApp();

  const copyHandler = () => {
    const path = withSiteId(routes.session(session.sessionId), siteId + '');
    copy(window.location.origin + path + '?jumpto=' + Math.round(range[0]));

    void message.success('Session link copied to clipboard');
  };
  return (
    <div className="bg-white p-3 flex justify-between items-center border-b">
      <UserCard session={props.session} />

      <Space>
        <Tooltip title="Copy session link" placement="bottom">
          <Button
            onClick={copyHandler}
            size={'small'}
            className="flex items-center justify-center"
          >
            <LinkIcon size={14} />
          </Button>
        </Tooltip>

        {isHighlight ? (
          <Button icon={<X size={14} strokeWidth={1} />} size={'small'} onClick={onClose} />
        ) : <QueueControls />}
      </Space>
    </div>
  );
}

export default ClipPlayerHeader;
