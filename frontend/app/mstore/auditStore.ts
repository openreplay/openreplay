import { toast } from '@/ui/overlays/toast';
import Period, { LAST_7_DAYS } from 'Types/app/period';
import { DateTime } from 'luxon';
import { action, makeAutoObservable, observable, runInAction } from 'mobx';

import { auditService } from 'App/services';
import { exportCSVFile } from 'App/utils';

// TODO
import Audit from './types/audit';

export default class AuditStore {
  list: any[] = [];

  total: number = 0;

  page: number = 1;

  pageSize: number = 20;

  searchQuery: string = '';

  isLoading: boolean = false;

  order: string = 'desc';

  period: ReturnType<typeof Period> | null = Period({ rangeName: LAST_7_DAYS });

  constructor() {
    makeAutoObservable(this, {
      searchQuery: observable,
      period: observable,
      updateKey: action,
      fetchAudits: action,
      setDateRange: action,
    });
  }

  setDateRange(data: any) {
    this.period = data;
  }

  updateKey(key: string, value: any) {
    this[key] = value;
  }

  fetchAudits = (data: any): Promise<void> => {
    this.isLoading = true;
    return new Promise((resolve, reject) => {
      auditService
        .all(data)
        .then((response) => {
          runInAction(() => {
            this.list = response.sessions.map((item) => Audit.fromJson(item));
            this.total = response.count;
          });
          resolve();
        })
        .catch((error) => {
          reject(error);
        })
        .finally(() => {
          this.isLoading = false;
        });
    });
  };

  fetchAllAudits = async (data: any): Promise<any> =>
    new Promise((resolve, reject) => {
      auditService
        .all(data)
        .then((data) => {
          const headers = [
            { label: 'User', key: 'username' },
            { label: 'Email', key: 'email' },
            { label: 'UserID', key: 'userId' },
            { label: 'Method', key: 'method' },
            { label: 'Action', key: 'action' },
            { label: 'Endpoint', key: 'endpoint' },
            { label: 'Created At', key: 'createdAt' },
          ];
          data = data.sessions.map((item) => ({
            ...item,
            createdAt: DateTime.fromMillis(item.createdAt).toFormat(
              'LLL dd yyyy hh:mm a',
            ),
          }));
          exportCSVFile(
            headers,
            data,
            `audit-${new Date().toLocaleDateString()}`,
          );
          resolve(data);
        })
        .catch((error) => {
          reject(error);
        });
    });

  /** Exports what the list shows: same search, order and window, every page. */
  exportToCsv = async (): Promise<void> => {
    const { startTimestamp, endTimestamp } = this.period?.toTimestamps() ?? {};
    const promise = this.fetchAllAudits({
      page: 1,
      limit: this.total,
      query: this.searchQuery,
      order: this.order,
      startDate: startTimestamp,
      endDate: endTimestamp,
    });
    toast.promise(promise, {
      pending: 'Exporting...',
      success: 'Export successful',
      error: 'Export failed',
    });
  };
}
