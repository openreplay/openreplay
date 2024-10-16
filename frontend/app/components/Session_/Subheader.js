import { ShareAltOutlined } from '@ant-design/icons';
import { Button as AntButton, Switch, Tooltip } from 'antd';
import cn from 'classnames';
import { Link2 } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React, { useMemo } from 'react';

import { PlayerContext } from 'App/components/Session/playerContext';
import { IFRAME } from 'App/constants/storageKeys';
import { useStore } from 'App/mstore';
import { checkParam, truncateStringToFit } from 'App/utils';
import SessionTabs from 'Components/Session/Player/SharedComponents/SessionTabs';
import KeyboardHelp from 'Components/Session_/Player/Controls/components/KeyboardHelp';
import WarnBadge from 'Components/Session_/WarnBadge';

import Bookmark from 'Shared/Bookmark';

import SharePopup from '../shared/SharePopup/SharePopup';
import Issues from './Issues/Issues';
import QueueControls from './QueueControls';
import NotePopup from './components/NotePopup';

const disableDevtools = 'or_devtools_uxt_toggle';

function SubHeader(props) {
  const { uxtestingStore, integrationsStore, sessionStore, projectsStore } = useStore();
  const currentSession = sessionStore.current
  const projectId = projectsStore.siteId;
  const integrations = integrationsStore.issues.list;
  const { store } = React.useContext(PlayerContext);
  const { location: currentLocation = 'loading...' } = store.get();
  const hasIframe = localStorage.getItem(IFRAME) === 'true';
  const [hideTools, setHideTools] = React.useState(false);
  React.useEffect(() => {
    const hideDevtools = checkParam('hideTools');
    if (hideDevtools) {
      setHideTools(true);
    }
  }, []);

  const enabledIntegration = useMemo(() => {
    if (!integrations || !integrations.length) {
      return false;
    }

    return integrations.some((i) => i.token);
  }, [integrations]);

  const locationTruncated = truncateStringToFit(
    currentLocation,
    window.innerWidth - 200
  );

  const toggleDevtools = (enabled) => {
    localStorage.setItem(disableDevtools, enabled ? '0' : '1');
    uxtestingStore.setHideDevtools(!enabled);
  };

  return (
    <>
      <div
        className="w-full px-4 flex items-center border-b relative"
        style={{
          background: uxtestingStore.isUxt()
            ? props.live
              ? '#F6FFED'
              : '#EBF4F5'
            : undefined,
        }}
      >
        <WarnBadge
          siteId={projectId}
          currentLocation={currentLocation}
          version={currentSession?.trackerVersion ?? '1.0.0'}
        />

        <SessionTabs />

        {!hideTools && (
          <div
            className={cn(
              'ml-auto text-sm flex items-center color-gray-medium gap-2',
              hasIframe ? 'opacity-50 pointer-events-none' : ''
            )}
            style={{ width: 'max-content' }}
          >
            <KeyboardHelp />
            <Bookmark sessionId={currentSession.sessionId} />
            <NotePopup />
            {enabledIntegration && <Issues sessionId={currentSession.sessionId} />}
            <SharePopup
              showCopyLink={true}
              trigger={
                <div className="relative">
                  <Tooltip title="Share Session" placement="bottom">
                    <AntButton
                      size={'small'}
                      className="flex items-center justify-center"
                    >
                      <ShareAltOutlined />
                    </AntButton>
                  </Tooltip>
                </div>
              }
            />

            {uxtestingStore.isUxt() ? (
              <Switch
                checkedChildren={'DevTools'}
                unCheckedChildren={'DevTools'}
                onChange={toggleDevtools}
                defaultChecked={!uxtestingStore.hideDevtools}
              />
            ) : (
              <div>
                <QueueControls />
              </div>
            )}
          </div>
        )}
      </div>

      {locationTruncated && (
        <div className={'w-full bg-white border-b border-gray-lighter'}>
          <div className="flex w-fit items-center cursor-pointer color-gray-medium text-sm p-1">
            <Link2 className="mx-2" size={16} />
            <Tooltip title="Open in new tab" delay={0} placement="bottom">
              <a href={currentLocation} target="_blank" className="truncate">
                {locationTruncated}
              </a>
            </Tooltip>
          </div>
        </div>
      )}
    </>
  );
}

export default observer(SubHeader);
