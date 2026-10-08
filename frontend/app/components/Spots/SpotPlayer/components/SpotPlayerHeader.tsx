import { IconButton } from '@/ui/actions/IconButton';
import { Button } from '@/ui/actions/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItems,
  DropdownMenuTrigger,
} from '@/ui/actions/dropdown-menu';
import { ConfirmDialog } from '@/ui/overlays/ConfirmDialog';
import { PopoverPanel } from '@/ui/overlays/popover';
import { useToast } from '@/ui/overlays/toast';
import copy from 'copy-to-clipboard';
import {
  Copy,
  Download,
  MoreHorizontal,
  Settings2,
  Trash2,
} from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { spotsList } from 'App/routes';
import { useHistory } from 'App/routing';
import { hashString } from 'App/types/session/session';
import { mobileScreen } from 'App/utils/isMobile';

import { SessionAvatar } from 'Shared/SessionAvatar/SessionAvatar';

import AccessModal from './AccessModal';

/** Who made the spot and what it was recorded on. */
export const SpotLead = observer(
  ({
    title,
    user,
    date,
    browserVersion,
    resolution,
    platform,
  }: {
    title: string;
    user: string;
    date: string;
    browserVersion: string | null;
    resolution: string | null;
    platform: string | null;
  }) => {
    const meta = [
      user,
      date,
      browserVersion ? `Chromium v${browserVersion}` : null,
      resolution,
      platform,
    ].filter(Boolean);
    return (
      <div className="m-rs__who">
        <SessionAvatar seed={hashString(user)} size={28} />
        <div className="m-rs__names">
          <span className="m-rs__name m-truncate" title={title}>
            {title}
          </span>
          <span className="m-rs__meta m-truncate">{meta.join(' · ')}</span>
        </div>
      </div>
    );
  },
);

/** Copy, access and the overflow menu; members only. */
export const SpotActions = observer(() => {
  const { t } = useTranslation();
  const toast = useToast();
  const history = useHistory();
  const { spotStore, userStore } = useStore();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isLoggedIn = !!userStore.jwt;
  const hasShareAccess = userStore.isEnterprise
    ? userStore.account.permissions.includes('SPOT_PUBLIC')
    : true;
  if (!isLoggedIn || mobileScreen) return null;
  const spot = spotStore.currentSpot!;

  const onCopy = () => {
    copy(window.location.href);
    toast.success(t('Internal sharing link copied to clipboard'));
  };
  const download = async () => {
    toast.info(t('Retrieving Spot video...'));
    const { url } = await spotStore.getVideo(spot.spotId);
    await downloadFile(url, `${spot.title}.webm`, () =>
      toast.error(t('Error downloading file.')),
    );
  };
  const remove = () => {
    setConfirmDelete(false);
    spotStore
      .deleteSpot([spot.spotId])
      .then(() => {
        history.push(spotsList());
        toast.success(t('Spot successfully deleted'));
      })
      .catch(() => toast.error(t('Failed to delete Spot')));
  };

  return (
    <>
      <Button onClick={onCopy}>
        <Copy size={13} />
        {t('Copy')}
      </Button>
      {hasShareAccess ? (
        <PopoverPanel
          placement="bottomRight"
          className="p-5"
          content={<AccessModal />}
        >
          <Button>
            <Settings2 size={13} />
            {t('Manage access')}
          </Button>
        </PopoverPanel>
      ) : null}
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
              {
                key: 'download',
                icon: <Download size={13} />,
                label: t('Download video'),
                onClick: () => void download(),
              },
              {
                key: 'delete',
                icon: <Trash2 size={13} />,
                label: t('Delete'),
                danger: true,
                onClick: () => setConfirmDelete(true),
              },
            ]}
          />
        </DropdownMenuContent>
      </DropdownMenu>
      <span className="m-rs__sep" aria-hidden="true" />
      <ConfirmDialog
        open={confirmDelete}
        title={t('Delete this spot?')}
        okText={t('Delete')}
        danger
        onCancel={() => setConfirmDelete(false)}
        onOk={remove}
      >
        {t(
          'Are you sure you want to delete this Spot? This action is permanent and cannot be undone.',
        )}
      </ConfirmDialog>
    </>
  );
});

async function downloadFile(
  url: string,
  fileName: string,
  onError: () => void,
) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // revoking right after click() can cancel the download in Firefox / Safari
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  } catch (error) {
    onError();
    console.error('Error downloading file:', error);
  }
}
