import React from 'react';
import EventDetailsModal, { Triangle } from '../Activity/EventDetailsModal';
import { Dropdown, Popover } from 'antd';
import { MoreOutlined, DeleteOutlined } from '@ant-design/icons';
import Event from 'Components/DataManagement/Activity/data/Event';
import { Files, Users, Eye, EyeOff } from 'lucide-react';
import copy from 'copy-to-clipboard';
import Select from 'Shared/Select';
import { tsToCheckRecent } from 'App/date';
import { useModal } from 'App/components/Modal';
import UserPropertiesModal from './components/UserPropertiesModal';
import Tag from './components/Tag';
import EventsByDay from './components/EventsByDay';
import Breadcrumb from 'Shared/Breadcrumb';
import { dataManagement } from 'App/routes';
import { useParams } from 'react-router';
import { useStore } from 'App/mstore';
import { useQuery } from '@tanstack/react-query';
import Activity from './components/UserActivity';

const list = [];
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
  const { showModal, hideModal } = useModal();
  const { analyticsStore } = useStore();

  const { data: user } = useQuery({
    queryKey: ['user-info', userId],
    queryFn: async () => {
      const response = await analyticsStore.fetchUserInfo(userId);
      return response;
    },
  });

  const dropdownItems = [
    {
      label: 'Delete User',
      key: 'delete-user',
      icon: <DeleteOutlined />,
      onClick: () => console.log('confirm'),
    },
  ];

  const showAll = () => {
    if (!user) return;
    showModal(<UserPropertiesModal properties={user.properties} />, {
      width: 420,
      right: true,
    });
  };

  const propLength = Object.keys(user?.properties ?? {}).length;
  const hasProperties = propLength > 0;
  return (
    <>
      <Breadcrumb
        items={[
          {
            label: 'Users',
            to: dataManagement.usersEventsList(),
            withSiteId: true,
          },
          { label: user?.name ?? user?.userId ?? 'User Details' },
        ]}
      />

      <div className={card}>
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <div
              className={
                'bg-gray-lighter h-11 w-12 rounded-full flex items-center justify-center text-gray-medium border border-gray-medium'
              }
            >
              {user?.name?.slice(0, 2) || 'OR'}
            </div>
            <div className="flex flex-col">
              <div className="text-xl font-semibold">{user?.name}</div>
              <div>{user?.userId}</div>
            </div>
          </div>
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
                          <div
                            className={
                              'ml-2 invisible group-hover:visible cursor-pointer active:text-blue'
                            }
                            onClick={() => copy(id)}
                          >
                            <Files size={14} />
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
            <div>{user?.userLocation}</div>
          </div>
          <div className={'flex items-center gap-4'}>
            {hasProperties ? (
              <div onClick={showAll} className={'link font-semibold'}>
                +{propLength} properties
              </div>
            ) : null}
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

export default UserPage;
