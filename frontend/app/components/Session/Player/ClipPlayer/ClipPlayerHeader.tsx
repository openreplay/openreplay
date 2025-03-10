import React from 'react';
import Session from 'Types/session';
import UserCard from 'Components/Session/Player/ClipPlayer/UserCard';
import QueueControls from 'Components/Session/Player/ClipPlayer/QueueControls';
import { App, Space, Button, Tooltip } from 'antd';
import copy from 'copy-to-clipboard';
import { withSiteId } from '@/routes';
import * as routes from '@/routes';
import { useStore } from '@/mstore';
import { LinkIcon, X } from 'lucide-react';
import { PartialSessionBadge } from 'Components/Session_/WarnBadge';
import { useTranslation } from 'react-i18next';

interface Props {
  session: Session;
  range: [number, number];
  onClose?: () => void;
  isHighlight?: boolean;
}

function ClipPlayerHeader(props: Props) {
  const { t } = useTranslation();
  const { projectsStore } = useStore();
  const { session, range, onClose, isHighlight } = props;
  const { siteId } = projectsStore;
  const { message } = App.useApp();

  const copyHandler = () => {
    const path = withSiteId(routes.session(session.sessionId), `${siteId}`);
    copy(`${window.location.origin + path}?jumpto=${Math.round(range[0])}`);

    void message.success('Session link copied to clipboard');
  };
  return (
    <div className="bg-white p-3 flex justify-between items-center border-b relative">
      {isHighlight ? <PartialSessionBadge /> : null}
      <UserCard session={props.session} />

      <Space>
        <Tooltip title={t('Copy link to clipboard')} placement="bottom">
          <Button
            onClick={copyHandler}
            size="small"
            className="flex items-center justify-center"
          >
            <LinkIcon size={14} />
          </Button>
        </Tooltip>

        {isHighlight ? (
          <Button
            icon={<X size={14} strokeWidth={1} />}
            size="small"
            onClick={onClose}
          />
        ) : (
          <QueueControls />
        )}
      </Space>
    </div>
  );
}

export default ClipPlayerHeader;
