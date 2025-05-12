import { ShareAltOutlined, MoreOutlined } from '@ant-design/icons';
import { Button as AntButton, Switch, Tooltip, Dropdown } from 'antd';
import cn from 'classnames';
import {
  Link2,
  Keyboard,
  Bot,
  Bookmark as BookmarkIcn,
  BookmarkCheck,
  Vault,
} from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React, { useMemo } from 'react';
import { Icon } from 'UI';
import { PlayerContext } from 'App/components/Session/playerContext';
import { IFRAME } from 'App/constants/storageKeys';
import { useStore } from 'App/mstore';
import { checkParam, truncateStringToFit } from 'App/utils';
import SessionTabs from 'Components/Session/Player/SharedComponents/SessionTabs';
import { ShortcutGrid } from 'Components/Session_/Player/Controls/components/KeyboardHelp';
import WarnBadge from 'Components/Session_/WarnBadge';
import { toast } from 'react-toastify';

import { useModal } from 'Components/ModalContext';
import IssueForm from 'Components/Session_/Issues/IssueForm';
import QueueControls from './QueueControls';
import HighlightButton from './Highlight/HighlightButton';
import ShareModal from '../shared/SharePopup/SharePopup';
import { useTranslation } from 'react-i18next';

const disableDevtools = 'or_devtools_uxt_toggle';

function SubHeader(props) {
  const {
    uxtestingStore,
    integrationsStore,
    sessionStore,
    projectsStore,
    userStore,
    issueReportingStore,
    settingsStore
  } = useStore();
  const { t } = useTranslation();
  const { favorite } = sessionStore.current;
  const { isEnterprise } = userStore;
  const currentSession = sessionStore.current;
  const projectId = projectsStore.siteId;
  const integrations = integrationsStore.issues.list;
  const { player, store } = React.useContext(PlayerContext);
  const { location: currentLocation = 'loading...' } = store.get();
  const hasIframe = localStorage.getItem(IFRAME) === 'true';
  const [hideTools, setHideTools] = React.useState(false);
  const [isFavorite, setIsFavorite] = React.useState(favorite);
  const { openModal, closeModal } = useModal();

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

  const issuesIntegrationList = integrationsStore.issues.list;
  const handleOpenIssueModal = () => {
    issueReportingStore.init({});
    if (!issueReportingStore.projectsFetched) {
      issueReportingStore.fetchProjects().then((projects) => {
        if (projects && projects[0]) {
          void issueReportingStore.fetchMeta(projects[0].id);
        }
      });
    }
    openModal(
      <IssueForm
        sessionId={currentSession.sessionId}
        closeHandler={closeModal}
        errors={[]}
      />,
      {
        title: t('Create Issue'),
      },
    );
  };

  const reportingProvider = issuesIntegrationList[0]?.provider || '';

  const locationTruncated = truncateStringToFit(
    currentLocation,
    window.innerWidth - 200,
  );

  const toggleDevtools = (enabled) => {
    localStorage.setItem(disableDevtools, enabled ? '0' : '1');
    uxtestingStore.setHideDevtools(!enabled);
  };

  const showKbHelp = () => {
    openModal(<ShortcutGrid />, { width: 320, title: t('Keyboard Shortcuts') });
  };

  const vaultIcon = isEnterprise ? (
    <Vault size={16} strokeWidth={1} />
  ) : isFavorite ? (
    <BookmarkCheck size={16} strokeWidth={1} />
  ) : (
    <BookmarkIcn size={16} strokeWidth={1} />
  );
  const toggleFavorite = () => {
    const onToggleFavorite = sessionStore.toggleFavorite;
    const ADDED_MESSAGE = isEnterprise
      ? t('Session added to vault')
      : t('Session added to your bookmarks');
    const REMOVED_MESSAGE = isEnterprise
      ? t('Session removed from vault')
      : t('Session removed from your bookmarks');

    onToggleFavorite(currentSession.sessionId).then(() => {
      toast.success(isFavorite ? REMOVED_MESSAGE : ADDED_MESSAGE);
      setIsFavorite(!isFavorite);
    });
  };

  const showVModeBadge = store.get().vModeBadge;
  const onVMode = () => {
    settingsStore.sessionSettings.updateKey('virtualMode', true);
    player.enableVMode?.();
    location.reload();
  }

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
          siteId={projectId!}
          currentLocation={currentLocation}
          version={currentSession?.trackerVersion ?? ''}
          virtualElsFailed={showVModeBadge}
          onVMode={onVMode}
        />

        <SessionTabs />

        {!hideTools && (
          <div
            className={cn(
              'ml-auto text-sm flex items-center color-gray-medium gap-2',
              hasIframe ? 'opacity-50 pointer-events-none' : '',
            )}
            style={{ width: 'max-content' }}
          >
            <Tooltip title={t('Share Session')} placement="bottom">
              <AntButton
                size="small"
                className="flex items-center justify-center"
                onClick={() =>
                  openModal(
                    <ShareModal
                      showCopyLink
                      hideModal={closeModal}
                      time={store?.get().time}
                    />,
                    { title: t('Share Session') },
                  )
                }
              >
                <ShareAltOutlined />
              </AntButton>
            </Tooltip>
            <HighlightButton onClick={() => props.setActiveTab('HIGHLIGHT')} />
            <Dropdown
              menu={{
                items: [
                  {
                    key: '2',
                    label: (
                      <div className="flex items-center gap-2">
                        {vaultIcon}
                        <span>{isEnterprise ? t('Vault') : t('Bookmark')}</span>
                      </div>
                    ),
                    onClick: toggleFavorite,
                  },
                  {
                    key: '4',
                    label: (
                      <div className="flex items-center gap-2">
                        <Icon
                          name={`integrations/${reportingProvider || 'github'}`}
                        />
                        <span>{t('Issues')}</span>
                      </div>
                    ),
                    disabled: !enabledIntegration,
                    onClick: handleOpenIssueModal,
                  },
                  {
                    key: '1',
                    label: (
                      <div className="flex items-center gap-2">
                        <Keyboard size={16} strokeWidth={1} />
                        <span>{t('Keyboard Shortcuts')}</span>
                      </div>
                    ),
                    onClick: showKbHelp,
                  },
                ]
              }}
            >
              <AntButton size="small">
                <MoreOutlined />
              </AntButton>
            </Dropdown>

            {uxtestingStore.isUxt() ? (
              <Switch
                checkedChildren="DevTools"
                unCheckedChildren="DevTools"
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
        <div className="w-full bg-white border-b border-gray-lighter">
          <div className="flex w-fit items-center cursor-pointer color-gray-medium text-sm p-1">
            <Link2 className="mx-2" size={16} />
            <Tooltip title={t('Open in new tab')} delay={0} placement="bottom">
              <a
                href={currentLocation}
                target="_blank"
                className="truncate"
                rel="noreferrer"
              >
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
