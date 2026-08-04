import React from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { Button, Dropdown, Tooltip } from 'antd';
import type { MenuProps } from 'antd';
import { ChevronDown, LayoutDashboard, Pin } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { dashboardSelected, withSiteId } from 'App/routes';
import seedStarterCards from '../DashboardList/seedStarterCards';
import { useHistory } from 'App/routing';

interface Props {
  siteId: string;
  onRename: () => void;
}

/**
 * Lets the user move between dashboards without leaving the dashboard itself.
 * Replaces the old flow of going back to a separate list screen to switch.
 */
function DashboardSwitcher({ siteId, onRename }: Props) {
  const { t } = useTranslation();
  const { dashboardStore, sessionStore } = useStore();
  const history = useHistory();
  const [creating, setCreating] = React.useState(false);

  const { dashboards } = dashboardStore;
  const dashboard: any = dashboardStore.selectedDashboard;

  const createDashboard = async () => {
    setCreating(true);
    dashboardStore.initDashboard();
    try {
      const created = await dashboardStore.save(dashboardStore.dashboardInstance);
      // Prefill the new dashboard so it opens with something on it.
      await seedStarterCards(created, {
        countSessions: async () => {
          const range = dashboardStore.period?.toTimestamps?.();
          const res: any = await sessionStore.getSessions({
            filters: [],
            sort: 'startTs',
            order: 'desc',
            eventsOrder: 'then',
            page: 1,
            limit: 1,
            startTimestamp: range?.startTimestamp,
            endTimestamp: range?.endTimestamp,
          });
          return res?.total ?? 0;
        },
      });
      dashboardStore.selectDashboardById(created.dashboardId);
      history.push(withSiteId(dashboardSelected(created.dashboardId), siteId));
    } finally {
      setCreating(false);
    }
  };

  const items: MenuProps['items'] = React.useMemo(() => {
    const list = dashboards.map((d: any) => ({
      key: String(d.dashboardId),
      label: (
        <div className="flex items-center gap-2 min-w-40">
          <LayoutDashboard size={14} className="shrink-0 opacity-60" />
          <span className="truncate">{d.name}</span>
          {d.isPinned ? (
            <Pin size={12} className="ml-auto shrink-0 opacity-60" />
          ) : null}
        </div>
      ),
    }));

    return [
      ...list,
      { type: 'divider' as const },
      {
        key: 'new',
        label: (
          <div className="flex items-center gap-2">
            <PlusOutlined />
            <span>{t('New dashboard')}</span>
          </div>
        ),
      },
    ];
  }, [dashboards, t]);

  const onSelect: MenuProps['onClick'] = ({ key }) => {
    if (key === 'new') {
      void createDashboard();
      return;
    }
    if (key === String(dashboard?.dashboardId)) return;
    history.push(withSiteId(dashboardSelected(key), siteId));
  };

  return (
    <div className="flex items-center gap-1 min-w-0">
      <Dropdown
        menu={{ items, onClick: onSelect, selectedKeys: [String(dashboard?.dashboardId)] }}
        trigger={['click']}
        disabled={creating}
      >
        <Button type="text" className="px-2 flex items-center gap-1 min-w-0">
          <span className="text-xl md:text-2xl truncate max-w-[16rem]">
            {dashboard?.name}
          </span>
          <ChevronDown size={16} className="shrink-0 opacity-60" />
        </Button>
      </Dropdown>

      <Tooltip title={t('Rename')} placement="bottom">
        <Button type="text" size="small" onClick={onRename} className="opacity-60">
          {t('Rename')}
        </Button>
      </Tooltip>
    </div>
  );
}

export default observer(DashboardSwitcher);
