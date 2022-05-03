import APIClient from 'App/api_client';

export default class SettingsService {
    private client: APIClient;

    constructor(client?: APIClient) {
        this.client = client ? client : new APIClient();
    }

    initClient(client?: APIClient) {
        this.client = client || new APIClient();
    }

    saveCaptureRate(data: any) {
        return this.client.post('/sample_rate', data);
    }

    fetchCaptureRate() {
        return this.client.get('/sample_rate')
            .then(response => response.json())
            .then(response => response.data || 0);
    }
}