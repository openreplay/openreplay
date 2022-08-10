import BaseService from './BaseService';
import { fetchErrorCheck } from 'App/utils'

export default class ErrorService extends BaseService {
    all(params: any = {}): Promise<any[]> {
        return this.client.post('/errors/search', params)
            .then(fetchErrorCheck)
            .then((response: { data: any; }) => response.data || []);
    }

    one(id: string): Promise<any> {
        return this.client.get(`/errors/${id}`)
            .then(fetchErrorCheck)
            .then((response: { data: any; }) => response.data || {});
    }
}