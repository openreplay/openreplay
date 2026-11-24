import { IErrorStack } from 'Types/session/errorStack';

import BaseService from './BaseService';

export default class ErrorService extends BaseService {
  fetchError = async (id: string) => {
    const r = await this.client.get(`/errors/${id}`);

    return await r.json();
  };

  fetchErrorTrace = async (
    id: string,
  ): Promise<{ trace: IErrorStack[]; sourcemapUploaded: boolean }> => {
    const r = await this.client.get(`/errors/${id}/sourcemaps`);
    const { data } = await r.json();

    return data;
  };

  fetchNewErrorsCount = async (params: any) => {
    const r = await this.client.get('/errors/stats', params);

    return await r.json();
  };
}
