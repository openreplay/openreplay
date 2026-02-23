import { CloseOutlined } from '@ant-design/icons';
import { Button, Form, Select, Tooltip } from 'antd';
import { TFunction } from 'i18next';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { PlayerContext } from 'App/components/Session/playerContext';
import { useStore } from 'App/mstore';
import { compareJsonObjects } from 'App/utils';
import { Loader } from 'UI';

import SelectorsList from './components/SelectorsList/SelectorsList';

const JUMP_OFFSET = 1000;
interface Props {
  setActiveTab: (tab: string) => void;
}

function PageInsightsPanel({ setActiveTab }: Props) {
  const { t } = useTranslation();
  const { sessionStore } = useStore();
  const { sessionId } = sessionStore.current;
  const startTs = sessionStore.current.startedAt;
  const loading = sessionStore.loadingSessionData;
  const events = sessionStore.visitedEvents;
  const filters = sessionStore.insightsFilters;
  const { fetchSessionClickmap } = sessionStore;
  const { insights } = sessionStore;
  const getPathname = (url: string) => {
    try {
      return new URL(url).pathname;
    } catch {
      return url;
    }
  };

  const urlOptions = events.map(({ url, host }: any) => ({
    label: getPathname(url),
    value: url,
    host,
  }));

  const { player: Player, store } = React.useContext(PlayerContext);
  const { location: currentLocation } = store.get();
  const markTargets = (t: TFunction) => Player.markTargets(t);
  const matchedUrl = currentLocation
    ? urlOptions.find((opt) => opt.value === currentLocation)?.value
    : undefined;
  const defaultValue = matchedUrl || (urlOptions[0]?.value ?? '');
  const [insightsFilters, setInsightsFilters] = useState({
    ...filters,
    url: defaultValue,
  });
  const prevInsights = React.useRef<any>();

  useEffect(() => {
    markTargets(insights);
    return () => {
      markTargets(null);
    };
  }, [insights]);

  useEffect(() => {
    const changed = !compareJsonObjects(prevInsights.current, insightsFilters);
    if (!changed) {
      return;
    }

    if (urlOptions && urlOptions[0]) {
      const url = insightsFilters.url
        ? insightsFilters.url
        : urlOptions[0].value;
      Player.pause();
      void fetchSessionClickmap(sessionId, {
        ...insightsFilters,
        sessionId,
        url,
      });
    }
    prevInsights.current = insightsFilters;
    return () => {
      prevInsights.current = undefined;
    };
  }, [insightsFilters]);

  const onPageSelect = (value: any) => {
    const event = events.find((item) => item.url === value);
    Player.jump(event.timestamp - startTs + JUMP_OFFSET);
    Player.pause();
    setInsightsFilters({ ...insightsFilters, url: value });
  };

  return (
    <div className="p-2 py-4 bg-white">
      <div className="flex items-center gap-2 mb-3 overflow-hidden">
        <div className="shrink-0 font-medium">{t('Page')}</div>
        <Form.Item name="url" className="mb-0! w-44!">
          <Select
            showSearch
            placeholder="change"
            options={urlOptions}
            defaultValue={defaultValue}
            onChange={(value) => onPageSelect(value)}
            id="change-dropdown"
            className="w-full rounded-lg max-w-[270px]"
          />
        </Form.Item>
        <Tooltip title={t('Close Panel')} placement="bottomRight">
          <Button
            className="ml-2"
            type="text"
            onClick={() => {
              setActiveTab('');
            }}
            icon={<CloseOutlined />}
          />
        </Tooltip>
      </div>
      <Loader loading={loading}>
        <SelectorsList />
      </Loader>
    </div>
  );
}

export default observer(PageInsightsPanel);
