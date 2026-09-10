import { makeAutoObservable } from 'mobx';
import { errorService } from 'App/services';

import { ErrorInfo } from './types/error';

export default class ErrorStore {
  instance: ErrorInfo | null = null;
  instanceTrace: Record<string, any>[] = [];
  stats: Record<string, any> = {};
  sourcemapUploaded = false;
  isLoadingError = false;
  isLoadingTrace = false;
  isLoadingStats = false;
  errorStates: Record<string, any> = {};
  /** bumped on every details fetch so late responses of a previous error are dropped */
  requestId = 0;

  constructor() {
    makeAutoObservable(this);
  }

  get isLoading() {
    return this.isLoadingError || this.isLoadingTrace;
  }

  setLoadingError(value: boolean) {
    this.isLoadingError = value;
  }

  setLoadingTrace(value: boolean) {
    this.isLoadingTrace = value;
  }

  setLoadingStats(value: boolean) {
    this.isLoadingStats = value;
  }

  setErrorState(actionKey: string, error: any) {
    this.errorStates[actionKey] = error;
  }

  setInstance(errorData: ErrorInfo | null) {
    this.instance = errorData ? new ErrorInfo(errorData) : null;
  }

  setInstanceTrace(trace: any) {
    this.instanceTrace = trace || [];
  }

  setSourcemapUploaded(value: boolean) {
    this.sourcemapUploaded = value;
  }

  setStats(stats: any) {
    this.stats = stats;
  }

  nextRequestId() {
    this.requestId += 1;
    return this.requestId;
  }

  async fetchErrorDetails(id: string) {
    const rid = this.nextRequestId();
    this.setInstance(null);
    this.setInstanceTrace([]);
    this.setSourcemapUploaded(false);
    this.setLoadingError(true);
    this.setLoadingTrace(true);
    await Promise.all([
      this.fetchError(id, rid),
      this.fetchErrorTrace(id, rid),
    ]);
  }

  async fetchError(id: string, rid = this.nextRequestId()) {
    const actionKey = 'fetchError';
    this.setLoadingError(true);
    this.setErrorState(actionKey, null);

    try {
      const response = await errorService.fetchError(id);
      if (rid !== this.requestId) return;
      this.setInstance(response.data);
    } catch (error) {
      if (rid !== this.requestId) return;
      this.setInstance(null);
      this.setErrorState(actionKey, error);
    } finally {
      if (rid === this.requestId) this.setLoadingError(false);
    }
  }

  async fetchErrorTrace(id: string, rid = this.nextRequestId()) {
    const actionKey = 'fetchErrorTrace';
    this.setLoadingTrace(true);
    this.setErrorState(actionKey, null);

    try {
      const response = await errorService.fetchErrorTrace(id);
      if (rid !== this.requestId) return;
      this.setInstanceTrace(response.trace);
      this.setSourcemapUploaded(response.sourcemapUploaded);
    } catch (error) {
      if (rid !== this.requestId) return;
      this.setErrorState(actionKey, error);
    } finally {
      if (rid === this.requestId) this.setLoadingTrace(false);
    }
  }

  async fetchNewErrorsCount(params: any) {
    const actionKey = 'fetchNewErrorsCount';
    this.setLoadingStats(true);
    this.setErrorState(actionKey, null);

    try {
      const response = await errorService.fetchNewErrorsCount(params);
      this.setStats(response.data);
    } catch (error) {
      this.setErrorState(actionKey, error);
    } finally {
      this.setLoadingStats(false);
    }
  }
}
