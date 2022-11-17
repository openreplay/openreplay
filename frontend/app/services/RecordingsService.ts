import APIClient from 'App/api_client';

interface RecordingData {
  name: string;
  duration: number;
}

interface FetchFilter {
  page: number;
  limit: number;
  order: 'asc' | 'desc';
  search: string;
}

export interface IRecord {
  createdAt: number;
  createdBy: string;
  duration: number;
  name: string;
  recordId: number;
  sessionId: number;
  userId: number;
  URL?: string;
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
    return this.client.put(`/${siteId}/assist/save`, recordingData).then((r) => {
      if (r.ok) {
        return r.json().then((j) => j.data.URL);
      } else {
        throw new Error("Can't reserve space for recording: " + r.status);
      }
    });
  }

  saveFile(url: string, file: Blob) {
    return fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'video/webm' },
      body: file,
    }).then((r) => {
      if (r.ok) {
        return true;
      } else {
        throw new Error("Can't upload file: " + r.status);
      }
    });
  }

  fetchRecordings(filters: FetchFilter): Promise<IRecord[]> {
    return this.client.post(`/assist/records`, filters).then((r) => {
      if (r.ok) {
        return r.json().then((j) => j.data);
      } else {
        throw new Error("Can't get recordings: " + r.status);
      }
    });
  }

  fetchRecording(id: number): Promise<IRecord> {
    return this.client.get(`/assist/records/${id}`).then((r) => {
      if (r.ok) {
        return r.json().then((j) => j.data);
      } else {
        throw new Error("Can't get recordings: " + r.status);
      }
    });
  }

  updateRecordingName(id: number, name: string): Promise<IRecord> {
    return this.client.post(`/assist/records/${id}`, { name }).then((r) => {
      if (r.ok) {
        return r.json().then((j) => j.data);
      } else {
        throw new Error("Can't get recordings: " + r.status);
      }
    });
  }

  deleteRecording(id: number): Promise<any> {
    return this.client.delete(`/assist/records/${id}`).then((r) => {
      if (r.ok) {
        return r.json().then((j) => j.data);
      } else {
        throw new Error("Can't get recordings: " + r.status);
      }
    });
  }
}
