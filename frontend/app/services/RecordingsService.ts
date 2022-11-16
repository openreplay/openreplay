import APIClient from 'App/api_client';

interface RecordingData {
  name: string;
  duration: number;
}

export default class RecordingsService {
  private client: APIClient;

    constructor(client?: APIClient) {
        this.client = client ? client : new APIClient();
    }

    initClient(client?: APIClient) {
        this.client = client || new APIClient();
    }

    reserveUrl(siteId: string, recordingData: RecordingData): Promise<string> {
      return this.client.put(`/${siteId}/assist/save`, recordingData)
        .then(r => {
          if (r.ok) {
            return r.json().then(j => j.data.URL)
          } else {
            throw new Error("Can't reserve space for recording: " + r.status);
          }
        })
    }

    saveFile(url: string, file: Blob) {
      return fetch(url, { method: 'PUT', headers: { 'Content-Type': 'video/webm' }, body: file })
        .then(r => {
          if (r.ok) {
            return true
          } else {
            throw new Error("Can't upload file: " + r.status)
          }
        })
    }

}
