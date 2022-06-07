import APIClient from 'App/api_client';
import { IUser } from 'App/mstore/types/user'

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
            .then(response => response.json())
            .then(response => response.data || []);
    }

    one(userId: string) {
        return this.client.get('/users/' + userId)
            .then(response => response.json())
            .then(response => response.data || {});
    }

    save(user: IUser): Promise<any> {
        const data = user.toSave();
        if (user.userId) {
            return this.client.put('/client/members/' + user.userId, data)
                .then(response => response.json())
                .then(response => response.data || {})
        } else {
            return this.client.post('/client/members', data)
                .then(response => response.json())
                .then(response => response.data || {});
        }
    }

    generateInviteCode(userId: any): Promise<any> {
        return this.client.get(`/client/members/${userId}/reset`)
            .then(response => response.json())
            .then(response => response.data || {});
    }

    delete(userId: string) {
        return this.client.delete('/client/members/' + userId)
            .then(response => response.json())
            .then(response => response.data || {});
    }

    getRoles() {
        return this.client.get('/client/roles')
            .then(response => response.json())
            .then(response => response.data || []);
    }

    getLimits() {
        return this.client.get('/limits')
            .then((response: { json: () => any; }) => response.json())
            .then((response: { data: any; }) => response.data || {});
    }
}