import { makeAutoObservable } from 'mobx';

import apiClient from 'App/api_client';
import { errorService, sessionService } from 'App/services';

import { ErrorInfo } from './types/error';

export default class ErrorStore {
  instance: ErrorInfo | null = null;

  instanceTrace: Record<string, any>[] = [];

  stats: Record<string, any> = {};

  sourcemapUploaded = false;

  isLoading = false;

  errorStates: Record<string, any> = {};

  constructor() {
    makeAutoObservable(this);
  }

  setLoadingState(value: boolean) {
    this.isLoading = value;
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

  async fetchError(id: string) {
    const actionKey = 'fetchError';
    this.setLoadingState(true);
    this.setErrorState(actionKey, null);

    try {
      const response = await errorService.fetchError(id);
      const errorData = response.data;
      this.setInstance(errorData);
    } catch (error) {
      this.setInstance(null);
      this.setErrorState(actionKey, error);
    } finally {
      this.setLoadingState(false);
    }
  }

  async fetchErrorTrace(id: string) {
    const actionKey = 'fetchErrorTrace';
    this.setLoadingState(true);
    this.setErrorState(actionKey, null);

    try {
      const response = await errorService.fetchErrorTrace(id);
      this.setInstanceTrace(response.trace);
      this.setSourcemapUploaded(response.sourcemapUploaded);
    } catch (error) {
      this.setErrorState(actionKey, error);
    } finally {
      this.setLoadingState(false);
    }
  }

  async fetchNewErrorsCount(params: any) {
    const actionKey = 'fetchNewErrorsCount';
    this.setLoadingState(true);
    this.setErrorState(actionKey, null);

    try {
      const response = await errorService.fetchNewErrorsCount(params);
      this.setStats(response.data);
    } catch (error) {
      this.setErrorState(actionKey, error);
    } finally {
      this.setLoadingState(false);
    }
  }
}
