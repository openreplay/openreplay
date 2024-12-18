import React, { useMemo } from 'react';
import QueueControls from 'Components/Session_/QueueControls';
import Bookmark from 'Shared/Bookmark';
import Issues from 'Components/Session_/Issues/Issues';
import NotePopup from 'Components/Session_/components/NotePopup';
import { Tag } from 'antd'
import { ShareAltOutlined } from '@ant-design/icons';
import { Button as AntButton, Popover } from 'antd';
import SharePopup from 'Components/shared/SharePopup/SharePopup';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';

function SubHeader(props: any) {
  const { sessionStore, integrationsStore} = useStore();
  const integrations = integrationsStore.issues.list;
  const isIOS = sessionStore.current.platform === 'ios';

  const enabledIntegration = useMemo(() => {
    if (!integrations || !integrations.length) {
      return false;
    }

    return integrations.some((i: Record<string, any>) => i.token);
  }, [props.integrations]);

  return (
    <>
      <div className="w-full px-4 flex items-center border-b relative">
        <Tag color="green" bordered={false} className='rounded-full'>{isIOS ? 'iOS' : 'Android'} BETA</Tag>
        <div
          className="ml-auto text-sm flex items-center color-gray-medium gap-2"
          style={{ width: 'max-content' }}
        >
          <NotePopup />
          {enabledIntegration && <Issues sessionId={props.sessionId} />}
          <Bookmark sessionId={props.sessionId} />
          <SharePopup
            showCopyLink={true}
            trigger={
              <div className="relative">
                <Popover content={'Share Session'}>
                  <AntButton size={'small'} className="flex items-center justify-center">
                    <ShareAltOutlined />
                  </AntButton>
                </Popover>
              </div>
            }
          />

          <div>
            {/* @ts-ignore */}
            <QueueControls />
          </div>
        </div>
      </div>
    </>
  );
}

export default observer(SubHeader);
