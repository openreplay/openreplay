import { useModal } from 'App/components/Modal';
import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { Loader, Pagination, NoContent } from 'UI';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import AuditDetailModal from '../AuditDetailModal';
import AuditListItem from '../AuditListItem';
import { useTranslation } from 'react-i18next';

interface Props {}
function AuditList(props: Props) {
  const { t } = useTranslation();
  const { auditStore } = useStore();
  const loading = useObserver(() => auditStore.isLoading);
  const list = useObserver(() => auditStore.list);
  const searchQuery = useObserver(() => auditStore.searchQuery);
  const page = useObserver(() => auditStore.page);
  const order = useObserver(() => auditStore.order);
  const period = useObserver(() => auditStore.period);
  const { showModal } = useModal();

  useEffect(() => {
    const { startTimestamp, endTimestamp } = period.toTimestamps();
    auditStore.fetchAudits({
      page: auditStore.page,
      limit: auditStore.pageSize,
      query: auditStore.searchQuery,
      order: auditStore.order,
      startDate: startTimestamp,
      endDate: endTimestamp,
    });
  }, [page, searchQuery, order, period]);

  return useObserver(() => (
    <Loader loading={loading}>
      <NoContent
        title={
          <div className="flex flex-col items-center justify-center">
            <AnimatedSVG name={ICONS.NO_AUDIT_TRAIL} size={60} />
            <div className="text-center my-4">{t('No data available')}</div>
          </div>
        }
        size="small"
        show={list.length === 0}
      >
        <div className="grid grid-cols-12 py-3 px-5 font-medium">
          <div className="col-span-5">{t('Name')}</div>
          <div className="col-span-4">{t('Action')}</div>
          <div className="col-span-3">{t('Time')}</div>
        </div>

        {list.map((item, index) => (
          <AuditListItem
            key={index}
            audit={item}
            onShowDetails={() =>
              showModal(<AuditDetailModal audit={item} />, {
                right: true,
                width: 500,
              })
            }
          />
        ))}

        <div className="w-full flex items-center justify-center py-10">
          <Pagination
            page={auditStore.page}
            total={auditStore.total}
            onPageChange={(page) => auditStore.updateKey('page', page)}
            limit={auditStore.pageSize}
            debounceRequest={200}
          />
        </div>
      </NoContent>
    </Loader>
  ));
}

export default AuditList;
