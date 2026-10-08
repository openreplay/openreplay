import { IconButton } from '@/ui/actions/IconButton';
import { Button } from '@/ui/actions/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItems,
  DropdownMenuTrigger,
} from '@/ui/actions/dropdown-menu';
import { Chip } from '@/ui/data/Chip';
import { Loader } from '@/ui/feedback/Loader';
import { CheckRow } from '@/ui/inputs/CheckRow';
import { DateRange } from '@/ui/inputs/DateRange';
import { PageCard } from '@/ui/layout/PageCard';
import { ConfirmDialog } from '@/ui/overlays/ConfirmDialog';
import { RenameDialog } from '@/ui/overlays/RenameDialog';
import { Modal } from '@/ui/overlays/modal';
import { PopoverPanel } from '@/ui/overlays/popover';
import { Tooltip } from '@/ui/overlays/tooltip';
import withPageTitle from 'HOCs/withPageTitle';
import {
  Download,
  Lock,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  Users,
} from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import AlertFormModal from 'App/components/Alerts/AlertFormModal';
import { useModal } from 'App/components/Modal';
import withModal from 'App/components/Modal/withModal';
import withReport from 'App/components/hocs/withReport';
import { useStore } from 'App/mstore';
import { withSiteId } from 'App/routes';
import { useHistory } from 'App/routing';

import '../../product-analytics.css';
import DashboardWidgetGrid from '../DashboardWidgetGrid';
import CardPicker from './CardPicker';

interface Props {
  siteId: string;
  dashboardId: any;
  renderReport?: () => void;
}

/** Each instance owns its popover, so the header's and the empty state's never open together. */
function AddCardButton() {
  const { t } = useTranslation();
  const [adding, setAdding] = React.useState(false);
  return (
    <PopoverPanel
      open={adding}
      onOpenChange={setAdding}
      placement="bottomRight"
      className="p-5"
      content={
        <CardPicker key={String(adding)} onDone={() => setAdding(false)} />
      }
    >
      <Button variant="primary">
        <Plus size={14} />
        {t('Add card')}
      </Button>
    </PopoverPanel>
  );
}

// one element for the grid's empty state, so the (observer, memoized) grid doesn't re-render with the page
const EMPTY_ADD_CARD = <AddCardButton />;

function DashboardView({ siteId, dashboardId, renderReport }: Props) {
  const { t } = useTranslation();
  const { dashboardStore, userStore } = useStore();
  const { showModal, hideModal } = useModal();
  const history = useHistory();
  const [renaming, setRenaming] = React.useState(false);
  const [access, setAccess] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const { showAlertModal } = dashboardStore;
  const dashboard = dashboardStore.selectedDashboard;

  useEffect(() => {
    if (showAlertModal) {
      showModal(
        <AlertFormModal
          showModal={showAlertModal}
          onClose={() => {
            hideModal();
            dashboardStore.toggleAlertModal(false);
          }}
        />,
        { right: false, width: 580 },
        () => dashboardStore.toggleAlertModal(false),
      );
    }
  }, [showAlertModal]);

  useEffect(() => {
    dashboardStore.resetPeriod();
    const params = new URLSearchParams(location.search);
    if (params.has('modal')) {
      params.delete('modal');
      history.replace({ search: params.toString() });
    }
    dashboardStore.resetDensity();
    return () => dashboardStore.resetSelectedDashboard();
  }, []);

  useEffect(() => {
    let cancelled = false;
    // the detail call is both the data and the existence check
    dashboardStore.fetch(dashboardId).catch(() => {
      if (!cancelled) history.push(withSiteId('/dashboard', siteId));
    });
    return () => {
      cancelled = true;
    };
  }, [dashboardId]);

  if (!dashboard) return <Loader loading className="mt-12" />;

  const update = (patch: Record<string, any>) => {
    dashboardStore.initDashboard(dashboard);
    dashboardStore.dashboardInstance.update(patch);
    void dashboardStore.save(dashboardStore.dashboardInstance);
  };

  return (
    <Loader loading={dashboardStore.fetchingDashboard}>
      <PageCard
        back={{
          label: t('Dashboards'),
          onClick: () => history.push(withSiteId('/dashboard', siteId)),
        }}
        title={dashboard.name}
        meta={
          <Chip kind="tag">
            {dashboard.isPublic ? <Users size={11} /> : <Lock size={11} />}
            {dashboard.isPublic ? t('Team') : t('Private')}
          </Chip>
        }
        actions={
          <>
            {dashboard.widgets.length > 0 ? <AddCardButton /> : null}
            <DateRange
              period={dashboardStore.period}
              onChange={(p) => dashboardStore.setPeriod(p)}
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
                    {
                      key: 'rename',
                      icon: <Pencil size={13} />,
                      label: t('Rename'),
                      onClick: () => setRenaming(true),
                    },
                    {
                      key: 'access',
                      icon: <Users size={13} />,
                      label: t('Visibility & access'),
                      onClick: () => setAccess(true),
                    },
                    {
                      key: 'report',
                      icon: <Download size={13} />,
                      label: userStore.isEnterprise ? (
                        t('Download report')
                      ) : (
                        <Tooltip
                          title={t('Available on Enterprise')}
                          side="left"
                        >
                          <span>{t('Download report')}</span>
                        </Tooltip>
                      ),
                      disabled: !userStore.isEnterprise,
                      onClick: renderReport,
                    },
                    { key: 'd1', type: 'divider' },
                    {
                      key: 'delete',
                      icon: <Trash2 size={13} />,
                      label: t('Delete'),
                      danger: true,
                      onClick: () => setDeleting(true),
                    },
                  ]}
                />
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
        split
      >
        <DashboardWidgetGrid
          siteId={siteId}
          id="report"
          addCard={EMPTY_ADD_CARD}
        />
      </PageCard>

      <RenameDialog
        open={renaming}
        title={t('Rename dashboard')}
        value={dashboard.name}
        onCancel={() => setRenaming(false)}
        onOk={(name) => {
          update({ name });
          setRenaming(false);
        }}
      />
      <Modal
        title={t('Visibility & access')}
        open={access}
        onCancel={() => setAccess(false)}
        footer={null}
        width={440}
      >
        <div className="flex flex-col gap-1">
          {[true, false].map((pub) => (
            <CheckRow
              key={String(pub)}
              single
              on={dashboard.isPublic === pub}
              onToggle={() => {
                if (dashboard.isPublic !== pub) update({ isPublic: pub });
                setAccess(false);
              }}
            >
              {pub ? t('Team') : t('Personal')}
            </CheckRow>
          ))}
        </div>
        <p className="m-dlg__lede mt-4">
          {t('Team can see and edit the dashboard.')}
        </p>
      </Modal>
      <ConfirmDialog
        open={deleting}
        title={t('Delete this dashboard?')}
        okText={t('Yes, delete')}
        danger
        onCancel={() => setDeleting(false)}
        onOk={() => {
          setDeleting(false);
          void dashboardStore
            .deleteDashboard(dashboard)
            .then((ok) => ok && history.push(withSiteId('/dashboard', siteId)));
        }}
      >
        {t(
          '{{name}} is permanently deleted. The cards on it stay in the library.',
          { name: dashboard.name },
        )}
      </ConfirmDialog>
    </Loader>
  );
}

export default withPageTitle('Dashboards - OpenReplay')(
  withReport(withModal(observer(DashboardView))),
);
