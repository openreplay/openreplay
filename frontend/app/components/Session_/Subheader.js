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
import { Icon } from 'UI';

import Bookmark from 'Shared/Bookmark';

import SharePopup from '../shared/SharePopup/SharePopup';
import Issues from './Issues/Issues';
import QueueControls from './QueueControls';
import NotePopup from './components/NotePopup';

const localhostWarn = (project) => project + '_localhost_warn';
const disableDevtools = 'or_devtools_uxt_toggle';

function SubHeader(props) {
  const { uxtestingStore, projectsStore, userStore, integrationsStore } = useStore();
  const integrations = integrationsStore.issues.list;
  const defaultLocalhostWarn = React.useMemo(() => {
    const siteId = projectsStore.siteId;
    const localhostWarnKey = localhostWarn(siteId);
    return localStorage.getItem(localhostWarnKey) !== '1';
  }, [projectsStore.siteId]);
  const [showWarningModal, setWarning] = React.useState(defaultLocalhostWarn);
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

  const showWarning =
    currentLocation &&
    /(localhost)|(127.0.0.1)|(0.0.0.0)/.test(currentLocation) &&
    showWarningModal;
  const closeWarning = () => {
    localStorage.setItem(localhostWarnKey, '1');
    setWarning(false);
  };

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
        {showWarning ? (
          <div
            className="px-3 py-1 border border-gray-lighter drop-shadow-md rounded bg-active-blue flex items-center justify-between"
            style={{
              zIndex: 999,
              position: 'absolute',
              left: '50%',
              bottom: '-24px',
              transform: 'translate(-50%, 0)',
              fontWeight: 500,
            }}
          >
            Some assets may load incorrectly on localhost.
            <a
              href="https://docs.openreplay.com/en/troubleshooting/session-recordings/#testing-in-localhost"
              target="_blank"
              rel="noreferrer"
              className="link ml-1"
            >
              Learn More
            </a>
            <div className="py-1 ml-3 cursor-pointer" onClick={closeWarning}>
              <Icon name="close" size={16} color="black" />
            </div>
          </div>
        ) : null}

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
            <Bookmark sessionId={props.sessionId} />
            <NotePopup />
            {enabledIntegration && <Issues sessionId={props.sessionId} />}
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
