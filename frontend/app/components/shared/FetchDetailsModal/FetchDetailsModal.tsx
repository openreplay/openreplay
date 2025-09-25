import React, { useEffect, useState } from 'react';
import { Button, Dropdown, Space } from 'antd';
import {
  ArrowRightOutlined,
  ArrowLeftOutlined,
  DownOutlined,
} from '@ant-design/icons';
import { ResourceType } from 'Player';
import { useStore } from 'App/mstore';
import { DateTime } from 'luxon';
import FetchTabs from './components/FetchTabs/FetchTabs';
import FetchBasicDetails from './components/FetchBasicDetails';
import { useTranslation } from 'react-i18next';
import { toFetch, toCurl, AnyResource } from './utils';

const copyItems = [
  {
    key: 'fetch',
    label: 'JS Fetch',
  },
  {
    key: 'curl',
    label: 'cURL',
  },
];

interface Props {
  resource: AnyResource;
  time?: number;
  rows?: any;
  fetchPresented?: boolean;
  isSpot?: boolean;
}
function FetchDetailsModal(props: Props) {
  const { t } = useTranslation();
  const { rows = [], fetchPresented = false, isSpot } = props;
  const [resource, setResource] = useState(props.resource);
  const [first, setFirst] = useState(false);
  const [last, setLast] = useState(false);

  const isXHR =
    resource.type === ResourceType.XHR ||
    resource.type === ResourceType.FETCH ||
    resource.type === ResourceType.IOS ||
    resource.type === ResourceType.GRAPHQL;

  const {
    sessionStore: { devTools },
    settingsStore: {
      sessionSettings: { timezone },
    },
  } = useStore();

  useEffect(() => {
    const index = rows.indexOf(resource);
    const length = rows.length - 1;
    setFirst(index === 0);
    setLast(index === length);
  }, [resource]);

  const prevClick = () => {
    const index = rows.indexOf(resource);
    if (index > 0) {
      setResource(rows[index - 1]);
      devTools.update('network', { index: index - 1 });
    }
  };

  const nextClick = () => {
    const index = rows.indexOf(resource);
    if (index < rows.length - 1) {
      setResource(rows[index + 1]);
      devTools.update('network', { index: index + 1 });
    }
  };

  const onDropdownClick = ({ key }: { key: string }) => {
    let text = '';
    if (key === 'curl') {
      text = toCurl(resource);
    } else if (key === 'fetch') {
      text = toFetch(resource);
    }
    if (text) {
      navigator.clipboard.writeText(text);
    }
  };
  return (
    <div
      className="bg-white p-5 h-screen overflow-y-auto"
      style={{ width: '500px' }}
    >
      <div className="flex items-center gap-4 mb-4 w-full justify-between">
        <h5 className="text-2xl">{t('Network Request')}</h5>
        <Dropdown menu={{ items: copyItems, onClick: onDropdownClick }}>
          <Space className="cursor-pointer hover:text-main">
            Copy as
            <DownOutlined />
          </Space>
        </Dropdown>
      </div>
      <FetchBasicDetails
        resource={resource}
        timestamp={
          resource.timestamp
            ? DateTime.fromMillis(resource.timestamp)
                .setZone(timezone.value)
                .toFormat('LLL dd, yyyy, hh:mm:ss a')
            : undefined
        }
      />

      <FetchTabs isSpot={isSpot} resource={resource} isXHR={isXHR} />

      {rows && rows.length > 0 && (
        <div className="flex justify-between absolute bottom-0 left-0 right-0 p-3 border-t bg-white">
          <Button
            type="text"
            onClick={prevClick}
            disabled={first}
            icon={<ArrowLeftOutlined />}
          >
            {t('Prev')}
          </Button>
          <Button
            type="text"
            onClick={nextClick}
            disabled={last}
            icon={<ArrowRightOutlined />}
          >
            {t('Next')}
          </Button>
        </div>
      )}
    </div>
  );
}

export default FetchDetailsModal;
