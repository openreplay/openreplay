import APIClient from 'App/api_client';
import { IUser } from 'App/mstore/types/user'
import { fetchErrorCheck } from 'App/utils'

export default class UserService {
    private client: APIClient;

    constructor(client?: APIClient) {
        this.client = client ? client : new APIClient();
    }

    initClient(client?: APIClient) {
        this.client = client || new APIClient();
    }

    all() {
        return this.client.get('/client/members')
            .then((response: { json: () => any; }) => response.json())
            .then((response: { data: any; }) => response.data || []);
    }

    one(userId: string) {
        return this.client.get('/users/' + userId)
            .then((response: { json: () => any; }) => response.json())
            .then((response: { data: any; }) => response.data || {});
    }

    save(user: IUser): Promise<any> {
        const data = user.toSave();
        if (user.userId) {
            return this.client.put('/client/members/' + user.userId, data)
                .then(fetchErrorCheck)
                .then((response: { data: any; }) => response.data || {})
        } else {
            return this.client.post('/client/members', data)
                .then(fetchErrorCheck)
                .then((response: { data: any; }) => response.data || {});
        }
    }

    generateInviteCode(userId: any): Promise<any> {
        return this.client.get(`/client/members/${userId}/reset`)
            .then((response: { json: () => any; }) => response.json())
            .then((response: { data: any; }) => response.data || {});
    }

    delete(userId: string) {
        return this.client.delete('/client/members/' + userId)
            .then(fetchErrorCheck)
            .then((response: { data: any; }) => response.data || {});
    }

    getRoles() {
        return this.client.get('/client/roles')
            .then((response: { json: () => any; }) => response.json())
            .then((response: { data: any; }) => response.data || []);
    }

    getLimits() {
        return this.client.get('/limits')
            .then((response: { json: () => any; }) => response.json())
            .then((response: { data: any; }) => response.data || {});
    }

    getNotificationsCount() {
        return this.client.get('/notifications/count')
            .then((response: { json: () => any; }) => response.json())
            .then((response: { data: any; }) => response.data || {});
    }

    getNotifications() {
        return this.client.get('/notifications')
            .then((response: { json: () => any; }) => response.json())
            .then((response: { data: any; }) => response.data || {});
    }

    ignoreNotification(notificationId: string) {
        return this.client.get(`/notifications/${notificationId}/view`)
            .then((response: { json: () => any; }) => response.json())
            .then((response: { data: any; }) => response.data || {});
    }

    ignoreAllNotifications(params: any) {
        return this.client.post(`/notifications/view`, params)
            .then((response: { json: () => any; }) => response.json())
            .then((response: { data: any; }) => response.data || {});
    }

}