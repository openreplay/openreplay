import { CopyButton } from '@/ui/actions/CopyButton';
import { IconButton } from '@/ui/actions/IconButton';
import { Button } from '@/ui/actions/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItems,
  DropdownMenuTrigger,
} from '@/ui/actions/dropdown-menu';
import { RelativeTime } from '@/ui/data/RelativeTime';
import { EmptyState } from '@/ui/feedback/EmptyState';
import { SkeletonRows } from '@/ui/feedback/SkeletonRows';
import { PageCard, PagePanel } from '@/ui/layout/PageCard';
import { ConfirmDialog } from '@/ui/overlays/ConfirmDialog';
import { PopoverPanel } from '@/ui/overlays/popover';
import { useToast } from '@/ui/overlays/toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import withPermissions from 'HOCs/withPermissions';
import { MoreHorizontal, Trash2 } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { dataManagement, withSiteId } from 'App/routes';
import { useHistory, useParams } from 'App/routing';

import '../data-management.css';
import { PersonAvatar, Where } from './components/PersonAvatar';
import Activity from './components/UserActivity';
import UserPropertiesDrawer, {
  flatPropertiesOf,
} from './components/UserPropertiesDrawer';

function UserPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const history = useHistory();
  const { userId } = useParams<{ userId: string }>();
  const { analyticsStore, projectsStore, settingsStore } = useStore();
  const queryClient = useQueryClient();
  const siteId = projectsStore.activeSiteId;
  const timezone = settingsStore.sessionSettings.timezone?.value;
  const [propsOpen, setPropsOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const queryKey = ['user-info', siteId, userId];
  const {
    data: user,
    refetch,
    isPending,
    error,
    failureCount,
  } = useQuery({
    queryKey,
    enabled: !!userId,
    retry: (c, e: any) => e?.cause?.status !== 404 && c < 3,
    queryFn: () => analyticsStore.fetchUserInfo(userId!),
  });

  const toList = () =>
    history.push(withSiteId(dataManagement.usersList(), siteId ?? ''));

  const saveProp = async (
    path: 'flat' | 'properties',
    key: string,
    value: string | number,
  ) => {
    if (!user) return;
    const payload =
      path === 'properties'
        ? { properties: { ...user.properties, [key]: value } }
        : { [`$${key}`]: value };
    const ok = await analyticsStore.updateUser(user.userId, payload);
    if (ok) void refetch();
    else toast.error(t('Failed to update property'));
  };

  const remove = async () => {
    setDeleting(false);
    if (!user) return;
    const ok = await analyticsStore.deleteUser(user.userId);
    if (!ok) {
      toast.error(t('Failed to delete user'));
      return;
    }
    queryClient.removeQueries({ queryKey });
    toList();
  };

  const notFound =
    (error as any)?.cause?.status === 404 || (!!error && failureCount > 2);
  const label =
    user && user.name !== 'N/A' ? user.name : user?.email || user?.userId || '';
  const ids = user?.distinctId ?? [];
  const propCount = user
    ? Object.keys(user.properties).length +
      Object.keys(flatPropertiesOf(user)).length
    : 0;

  if (notFound)
    return (
      <PageCard
        back={{ label: t('People'), onClick: toList }}
        title={t('Person')}
      >
        <EmptyState
          art="people"
          title={t('This person was not found')}
          hint={t('They may have been deleted, or the link is wrong.')}
          action={<Button onClick={toList}>{t('Back to people')}</Button>}
        />
      </PageCard>
    );

  return (
    <PageCard
      back={{ label: t('People'), onClick: toList }}
      title={label || t('Person')}
      split
    >
      <PagePanel>
        {isPending || !user ? (
          <SkeletonRows rows={2} columns={[40, 60]} />
        ) : (
          <div className="m-person__card">
            <div className="m-person__who">
              <PersonAvatar
                userId={user.userId}
                avatarUrl={user.avatarUrl}
                size={48}
              />
              <div className="m-person__names">
                <span className="m-person__name m-truncate">{label}</span>
                <span className="m-person__id">
                  <span className="m-dmg__mono m-truncate">{user.userId}</span>
                  <CopyButton
                    text={user.userId}
                    label={t('Copy user ID')}
                    variant="ghost"
                  />
                </span>
              </div>
            </div>
            <dl className="m-person__facts">
              {user.email && (
                <div className="m-person__fact">
                  <dt>{t('Email')}</dt>
                  <dd>
                    <span className="m-truncate">{user.email}</span>
                    <CopyButton
                      text={user.email}
                      label={t('Copy email')}
                      variant="ghost"
                    />
                  </dd>
                </div>
              )}
              {ids.length > 0 && (
                <div className="m-person__fact">
                  <dt>{t('Distinct ID')}</dt>
                  <dd>
                    <span className="m-dmg__mono m-truncate">{ids[0]}</span>
                    {ids.length > 1 && (
                      <PopoverPanel
                        placement="bottomLeft"
                        className="p-5"
                        content={
                          <div className="m-person__ids">
                            <p className="m-person__ids-title">
                              {t('Tracking IDs linked to this user')}
                            </p>
                            <ul className="m-person__ids">
                              {ids.map((id) => (
                                <li key={id}>
                                  <span className="m-dmg__mono m-truncate">
                                    {id}
                                  </span>
                                  <CopyButton
                                    text={id}
                                    label={t('Copy {{id}}', { id })}
                                    variant="ghost"
                                  />
                                </li>
                              ))}
                            </ul>
                          </div>
                        }
                      >
                        <button type="button" className="m-person__more">
                          +{ids.length - 1}
                        </button>
                      </PopoverPanel>
                    )}
                  </dd>
                </div>
              )}
              <div className="m-person__fact">
                <dt>{t('Location')}</dt>
                <dd>
                  <Where
                    city={user.city}
                    state={user.state}
                    country={user.country}
                  />
                </dd>
              </div>
              {user.lastSeen ? (
                <div className="m-person__fact">
                  <dt>{t('Last seen')}</dt>
                  <dd>
                    <RelativeTime at={user.lastSeen} timezone={timezone} />
                  </dd>
                </div>
              ) : null}
            </dl>
            <div className="m-person__actions">
              <Button variant="subtle" onClick={() => setPropsOpen(true)}>
                {t('+{{n}} properties', { n: propCount })}
              </Button>
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
                        key: 'delete',
                        icon: <Trash2 size={13} />,
                        label: t('Delete user'),
                        danger: true,
                        onClick: () => setDeleting(true),
                      },
                    ]}
                  />
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )}
      </PagePanel>

      {userId && <Activity userId={userId} name={label || userId} />}

      {user && (
        <UserPropertiesDrawer
          open={propsOpen}
          onClose={() => setPropsOpen(false)}
          user={user}
          onSave={saveProp}
        />
      )}
      <ConfirmDialog
        open={deleting}
        title={t('Delete this user?')}
        okText={t('Delete')}
        danger
        onCancel={() => setDeleting(false)}
        onOk={() => void remove()}
      >
        {t(
          '{{name}} and their properties are permanently deleted. Their sessions stay in Recordings, without a name on them.',
          { name: label },
        )}
      </ConfirmDialog>
    </PageCard>
  );
}

export default withPermissions(
  ['DATA_MANAGEMENT'],
  '',
  false,
  false,
)(observer(UserPage));
