import BaseService from './BaseService';

export default class ErrorService extends BaseService {
    all(params: any = {}): Promise<any[]> {
        return this.client.post('/errors/search', params)
            .then(r => r.json())
            .then((response: { data: any; }) => response.data || [])
            .catch(e => Promise.reject(e))
    }

    one(id: string): Promise<any> {
        return this.client.get(`/errors/${id}`)
            .then(r => r.json())
            .then((response: { data: any; }) => response.data || {})
            .catch(e => Promise.reject(e))
    }
}