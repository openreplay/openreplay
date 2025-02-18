import React from 'react';
import EventDetailsModal, { Triangle } from '../Activity/EventDetailsModal';
import User from './data/User';
import { Dropdown, Popover } from 'antd';
import { MoreOutlined, DeleteOutlined } from '@ant-design/icons';
import Event from 'Components/DataManagement/Activity/data/Event';
import { Files, Users, Eye, EyeOff } from 'lucide-react';
import copy from 'copy-to-clipboard';
import { list } from '../Activity/Page';
import Select from 'Shared/Select';
import { tsToCheckRecent } from 'App/date';
import { useModal } from 'App/components/Modal';
import UserPropertiesModal from './components/UserPropertiesModal';
import Tag from './components/Tag';
import EventsByDay from './components/EventsByDay';
import Breadcrumb from 'Shared/Breadcrumb';
import { dataManagement } from 'App/routes'

const card = 'rounded-lg border bg-white';

function UserPage() {
  return (
    <div className={'flex flex-col gap-2 mx-auto'} style={{ maxWidth: 1360 }}>
      <UserInfo />
      <Activity />
    </div>
  );
}

function Activity() {
  const testEvs = [...list, ...list, ...list];
  const [show, setShow] = React.useState(true);
  const { showModal, hideModal } = useModal();

  const onItemClick = (ev: Event) => {
    showModal(<EventDetailsModal ev={ev} onClose={hideModal} />, {
      width: 420,
      right: true,
    });
  };
  const byDays: Record<string, Event[]> = testEvs.reduce((acc, ev) => {
    const date = tsToCheckRecent(ev.time, 'LLL dd, yyyy');
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(ev);
    return acc;
  }, {});

  const toggleEvents = () => {
    setShow((prev) => !prev);
  };
  return (
    <div className={card}>
      <div className={'px-4 py-2 flex items-center gap-2'}>
        <div className={'text-lg font-semibold'}>Activity</div>
        <div className={'link flex gap-1 items-center'}>
          <span>Play Sessions</span>
          <Triangle size={10} color={'blue'} />
        </div>
        <div className={'ml-auto'} />
        <div
          className={'flex items-center gap-2 cursor-pointer'}
          onClick={toggleEvents}
        >
          {!show ? <Eye size={16} /> : <EyeOff size={16} />}
          <span className={'font-medium'}>{show ? 'Hide' : 'Show'} Events</span>
        </div>
        <Select
          options={[
            { label: 'Newest', value: 'DESC' },
            { label: 'Oldest', value: 'ASC' },
          ]}
          defaultValue={'DESC'}
          plain
          onChange={({ value }) => {
            console.log(value);
          }}
        />
      </div>
      <div className={show ? 'block' : 'hidden'}>
        <EventsByDay byDays={byDays} onItemClick={onItemClick} />
      </div>
    </div>
  );
}

function UserInfo() {
  const { showModal, hideModal } = useModal();
  const testUser = new User({
    name: 'test user',
    userId: 'test@email.com',
    distinctId: ['123123123123', '123123123123', '123123123123'],
    userLocation: 'NY',
    cohorts: ['test'],
    properties: {
      email: 'test@test.com',
    },
    updatedAt: Date.now(),
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
    showModal(<UserPropertiesModal properties={testUser.properties} />, {
      width: 420,
      right: true,
    });
  };

  return (
    <>
      <Breadcrumb items={[
        { label: 'Users', to: dataManagement.users(), withSiteId: true },
        { label: testUser.name },
      ]} />

    <div className={card}>
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <div
            className={
              'bg-gray-lighter h-11 w-12 rounded-full flex items-center justify-center text-gray-medium border border-gray-medium'
            }
          >
            {testUser.name.slice(0, 2)}
          </div>
          <div className="flex flex-col">
            <div className="text-xl font-semibold">{testUser.name}</div>
            <div>{testUser.userId}</div>
          </div>
        </div>
        <div className="flex flex-col">
          <div className={'font-semibold'}>Distinct ID</div>
          <div>
            {testUser.distinctId[0]}
            {testUser.distinctId.length > 1 && (
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
                    {testUser.distinctId.map((id) => (
                      <div className={'w-full group flex justify-between'}>
                        <span>{id}</span>
                        <div
                          className={
                            'hidden group-hover:block cursor-pointer active:text-blue'
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
                  <Tag>+{testUser.distinctId.length - 1}</Tag>
                </div>
              </Popover>
            )}
          </div>
        </div>
        <div className="flex flex-col">
          <div className={'font-semibold'}>Location</div>
          <div>{testUser.userLocation}</div>
        </div>
        <div className={'flex items-center gap-4'}>
          <div onClick={showAll} className={'link font-semibold'}>
            +{Object.keys(testUser.properties).length} properties
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
      <div className="flex items-center p-4">
        <Users size={14} />
        <div className={'mr-4 ml-2'}>Cohorts</div>
        {testUser.cohorts.map((cohort) => (
          <Tag>{cohort}</Tag>
        ))}
      </div>
    </div>
    </>
  );
}

export default UserPage;
