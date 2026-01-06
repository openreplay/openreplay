import React from 'react';
import { Dropdown, Popover, Button } from 'antd';
import { MoreOutlined, DeleteOutlined } from '@ant-design/icons';
import { useModal } from 'App/components/Modal';
import withPermissions from 'HOCs/withPermissions';
import UserPropertiesModal from './components/UserPropertiesModal';
import Tag from './components/Tag';
import Breadcrumb from 'Shared/Breadcrumb';
import { dataManagement, withSiteId } from 'App/routes';
import { useParams, useHistory } from 'react-router';
import { useStore } from 'App/mstore';
import { useQuery } from '@tanstack/react-query';
import Activity from './components/UserActivity';
import { observer } from 'mobx-react-lite';
import { CopyButton, confirm, CountryFlag } from 'UI';
import NameAvatar from 'Shared/NameAvatar';

const card = 'rounded-lg border bg-white';

function UserPage() {
  const { userId } = useParams<{ userId: string }>();
  return (
    <div className={'flex flex-col gap-2 mx-auto'} style={{ maxWidth: 1360 }}>
      <UserInfo userId={userId} />
      <Activity userId={userId} />
    </div>
  );
}

function UserInfo({ userId }: { userId: string }) {
  const history = useHistory();
  const { showModal } = useModal();
  const { analyticsStore, projectsStore } = useStore();
  const {
    data: user,
    refetch,
    failureCount,
    error,
  } = useQuery({
    queryKey: ['user-info', userId],
    retry: (c, e) => {
      if (e.cause?.status === 404) {
        return false;
      }
      return c < 3;
    },
    queryFn: async () => {
      const response = await analyticsStore.fetchUserInfo(userId);
      return response;
    },
  });

  const onPropSave = async (
    path: string,
    key: string,
    value: string | number,
  ) => {
    if (!user) return;
    // i.e if path is 'properties', then payload = { properties: { ...user.properties, [key]: value } }

    const payload =
      path === 'properties'
        ? {
            [path]: {
              ...user[path],
              [key]: value,
            },
          }
        : { ['$' + key]: value };

    await analyticsStore.updateUser(user.userId, payload);
    setTimeout(() => {
      refetch();
    }, 100);
  };

  const onDelete = async (userId: string) => {
    const confirmed = await confirm({
      header: 'Delete User',
      confirmation: 'Are you sure you want to permanently delete this user?',
      confirmButton: 'Yes, Delete',
    } as any);
    if (!confirmed) return;
    await analyticsStore.deleteUser(userId);
    history.push(
      withSiteId(dataManagement.usersList(), projectsStore.activeSiteId ?? ''),
    );
  };

  const dropdownItems = [
    {
      label: 'Delete User',
      key: 'delete-user',
      icon: <DeleteOutlined />,
      onClick: () => {
        onDelete(userId);
      },
    },
  ];

  const showAll = () => {
    if (!user) return;
    showModal(
      <UserPropertiesModal
        properties={user.properties}
        rawProperties={user.raw}
        onSave={(path, key, value) => onPropSave(path, key, value)}
      />,
      {
        width: 620,
        right: true,
      },
    );
  };

  const openList = () => {
    history.push(
      withSiteId(
        dataManagement.usersList(),
        projectsStore.activeSiteId ?? '',
      ),
    );
  };
  const propLength = Object.keys(user?.properties ?? {}).length + 7;
  if (error?.cause?.status === 404 || failureCount > 2) {
    return (
      <>
        <Breadcrumb
          items={[
            {
              label: 'Users',
              to: dataManagement.usersList(),
              withSiteId: true,
            },
            { label: 'User Details' },
          ]}
        />

        <div className={card}>
          <div className="flex flex-col items-center justify-center p-8 gap-4">
            <h2 className="text-xl font-semibold p-4 border-b">
              Something went wrong or user was not found
            </h2>
            <div className="p-4">
              The user you are looking for does not exist.
            </div>
            <Button onClick={openList}>Go Back</Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Breadcrumb
        items={[
          {
            label: 'People',
            to: dataManagement.usersList(),
            withSiteId: true,
          },
          { label: user?.name || user?.userId || 'User Details' },
        ]}
      />

      <div className={card}>
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt="avatar"
                className="h-12 w-12 rounded-full"
                style={{
                  objectFit: 'cover',
                }}
              />
            ) : (
              <NameAvatar name={user?.name || 'N/A'} size={48} />
            )}
            <div className="flex flex-col">
              <div className="text-xl font-semibold">{user?.name || 'N/A'}</div>
              <div className={'flex items-center gap-2'}>
                <div>{user?.userId}</div>
                <CopyButton content={user?.userId || ''} isIcon />
              </div>
            </div>
          </div>
          {user?.email ? (
            <div className="flex flex-col">
              <div className={'font-semibold'}>Email</div>
              <div className={'flex items-center gap-2'}>
                <div>{user?.email}</div>
                <CopyButton content={user?.email || ''} isIcon />
              </div>
            </div>
          ) : null}
          <div className="flex flex-col">
            <div className={'font-semibold'}>Distinct ID</div>
            <div>
              {user?.distinctId[0]}
              {user?.distinctId?.length && user?.distinctId.length > 1 && (
                <Popover
                  title={
                    <div className={'text-disabled-text'}>
                      Tracking IDs linked to this user
                    </div>
                  }
                  trigger={'click'}
                  placement={'bottom'}
                  arrow={false}
                  content={
                    <div className={'flex flex-col gap-2'}>
                      {user?.distinctId.map((id) => (
                        <div className={'w-full group flex justify-between'}>
                          <span>{id}</span>
                          <div className={'ml-2 invisible group-hover:visible'}>
                            <CopyButton content={id} isIcon />
                          </div>
                        </div>
                      ))}
                    </div>
                  }
                >
                  <div className={'w-fit cursor-pointer inline-block ml-2'}>
                    <Tag>+{user?.distinctId.length - 1}</Tag>
                  </div>
                </Popover>
              )}
            </div>
          </div>
          <div className="flex flex-col">
            <div className={'font-semibold'}>Location</div>
            <div className={'flex items-center gap-2'}>
              <CountryFlag
                userCity={user?.city}
                userState={user?.state}
                country={user?.country}
              />
              {user?.userLocation}
            </div>
          </div>
          <div className={'flex items-center gap-4'}>
            <div onClick={showAll} className={'link font-semibold'}>
              +{propLength} properties
            </div>
            <Dropdown
              menu={{ items: dropdownItems }}
              trigger={['click']}
              placement={'bottomRight'}
            >
              <div className={'cursor-pointer'}>
                <MoreOutlined />
              </div>
            </Dropdown>
          </div>
        </div>
        {/* <div className="flex items-center p-4">
          <Users size={14} />
          <div className={'mr-4 ml-2'}>Cohorts</div>
          {testUser.cohorts.map((cohort) => (
            <Tag>{cohort}</Tag>
          ))}
        </div> */}
      </div>
    </>
  );
}

export default withPermissions(
  ['DATA_MANAGEMENT'],
  '',
  false,
  false,
)(observer(UserPage));
