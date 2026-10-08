import { IconButton } from '@/ui/actions/IconButton';
import { Button } from '@/ui/actions/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItems,
  DropdownMenuTrigger,
} from '@/ui/actions/dropdown-menu';
import { useToast } from '@/ui/overlays/toast';
import {
  Bookmark,
  BookmarkCheck,
  Bug,
  Code2,
  Film,
  Keyboard,
  MoreHorizontal,
  Radio,
  Search,
  Share2,
  Vault,
} from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { PlayerContext } from 'App/components/Session/playerContext';
import { IFRAME } from 'App/constants/storageKeys';
import { useStore } from 'App/mstore';
import { liveSession as liveSessionRoute, withSiteId } from 'App/routes';
import { useNavigate } from 'App/routing';
import { useModal } from 'Components/ModalContext';
import IssueForm from 'Components/Session_/Issues/IssueForm';
import { ShortcutGrid } from 'Components/Session_/Player/Controls/components/KeyboardHelp';
import QueueControls from 'Components/Session_/QueueControls';

import { ShareDialog } from 'Shared/SharePopup/SharePopup';

function ReplayActions({
  activeTab,
  setActiveTab,
}: {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  const { openModal, closeModal } = useModal();
  const { store } = React.useContext(PlayerContext);
  const {
    sessionStore,
    userStore,
    integrationsStore,
    issueReportingStore,
    recordingsStore,
    uiPlayerStore,
    projectsStore,
  } = useStore();
  const { isEnterprise, account } = userStore;
  const session = sessionStore.current;
  const [favorite, setFavorite] = React.useState(session.favorite);
  React.useEffect(() => setFavorite(session.favorite), [session.favorite]);
  const iframe = localStorage.getItem(IFRAME) === 'true';
  const integrations = integrationsStore.issues.list;
  const canReport = integrations.some((i: any) => i.token);

  const toggleFavorite = () =>
    sessionStore.toggleFavorite(session.sessionId).then(() => {
      toast.success(
        favorite
          ? isEnterprise
            ? t('Session removed from vault')
            : t('Session removed from your bookmarks')
          : isEnterprise
            ? t('Session added to vault')
            : t('Session added to your bookmarks'),
      );
      setFavorite(!favorite);
    });

  const [shareAt, setShareAt] = React.useState<number | null>(null);
  const share = () => setShareAt(store?.get().time ?? 0);

  const reportIssue = () => {
    issueReportingStore.init({});
    if (!issueReportingStore.projectsFetched) {
      issueReportingStore.fetchProjects().then((projects: any[]) => {
        if (projects?.[0]) void issueReportingStore.fetchMeta(projects[0].id);
      });
    }
    openModal(
      <IssueForm
        sessionId={session.sessionId}
        closeHandler={closeModal}
        errors={[]}
      />,
      { title: t('Create Issue') },
    );
  };

  const exportVideo = async () => {
    const status = await recordingsStore.triggerExport(session.sessionId);
    const labels: Record<string, string> = {
      pending: t('Session export started'),
      success: t(
        'Session already exported, go to Preferences > Exported Videos',
      ),
      failure: t('Session export failed, please try again later'),
    };
    toast.info(labels[status ?? 'pending']);
  };

  if (iframe) return null;

  return (
    <>
      {session.live && (
        <Button
          variant="subtle"
          onClick={() =>
            navigate(
              withSiteId(
                liveSessionRoute(session.sessionId),
                projectsStore.siteId!,
              ),
            )
          }
        >
          <Radio size={13} />
          {t('Continuing live')}
        </Button>
      )}
      <IconButton
        icon={
          isEnterprise ? (
            <Vault size={15} />
          ) : favorite ? (
            <BookmarkCheck size={15} />
          ) : (
            <Bookmark size={15} />
          )
        }
        label={
          isEnterprise
            ? favorite
              ? t('Remove from vault')
              : t('Add to vault')
            : favorite
              ? t('Remove bookmark')
              : t('Bookmark')
        }
        variant="ghost"
        pressed={favorite}
        onClick={toggleFavorite}
      />
      <IconButton
        icon={<Share2 size={15} />}
        label={t('Share session')}
        variant="ghost"
        onClick={share}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <span>
            <IconButton
              icon={<MoreHorizontal size={15} />}
              label={t('More')}
              variant="ghost"
            />
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItems
            items={[
              ...(uiPlayerStore.showSearchEventsSwitchButton
                ? [
                    {
                      key: 'searched',
                      icon: <Search size={13} />,
                      label: uiPlayerStore.showOnlySearchEvents
                        ? t('Show every event')
                        : t('Show searched events only'),
                      onClick: () =>
                        uiPlayerStore.setShowOnlySearchEvents(
                          !uiPlayerStore.showOnlySearchEvents,
                        ),
                    },
                  ]
                : []),
              ...(session.isMobileNative
                ? []
                : [
                    {
                      key: 'e2e',
                      icon: <Code2 size={13} />,
                      label: t('Export as E2E test'),
                      onClick: () => setActiveTab('EXPORT'),
                    },
                  ]),
              {
                key: 'issue',
                icon: <Bug size={13} />,
                label: t('Create issue'),
                disabled: !canReport,
                onClick: reportIssue,
              },
              ...(isEnterprise
                ? [
                    {
                      key: 'video',
                      icon: <Film size={13} />,
                      label: t('Export video'),
                      disabled: !account.hasExportPermission,
                      onClick: exportVideo,
                    },
                  ]
                : []),
              { key: 'div', type: 'divider' as const },
              {
                key: 'keys',
                icon: <Keyboard size={13} />,
                label: t('Keyboard shortcuts'),
                onClick: () =>
                  openModal(<ShortcutGrid />, {
                    width: 320,
                    title: t('Keyboard Shortcuts'),
                  }),
              },
            ]}
          />
        </DropdownMenuContent>
      </DropdownMenu>
      <span className="m-rs__sep" aria-hidden="true" />
      <QueueControls {...({} as any)} />
      <ShareDialog
        open={shareAt !== null}
        time={shareAt ?? undefined}
        onClose={() => setShareAt(null)}
      />
    </>
  );
}

export default observer(ReplayActions);
