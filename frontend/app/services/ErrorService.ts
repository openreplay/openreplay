import BaseService from './BaseService';

export default class ErrorService extends BaseService {
    all(params: any = {}): Promise<any[]> {
        return this.client.post('/errors/search', params)
            .then(response => response.json())
            .then(response => response.data || []);
    }

    one(id: string): Promise<any> {
        return this.client.get(`/errors/${id}`)
            .then(response => response.json())
    }
}