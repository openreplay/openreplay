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

    save(user: IUser) {
        const data = user.toJson();
        if (user.userId) {
            return this.client.put('/users/' + user.userId, data)
                .then(response => response.json())
                .then(response => response.data || {});
        } else {
            return this.client.post('/users', data)
                .then(response => response.json())
                .then(response => response.data || {});
        }
    }

    delete(userId: string) {
        return this.client.delete('/users/' + userId)
            .then(response => response.json())
            .then(response => response.data || {});
    }
}