import APIClient from 'App/api_client';

interface RecordingData {
  name: string;
  duration: number;
  sessionId: string;
}

interface FetchFilter {
  page: number;
  limit: number;
  order: 'asc' | 'desc';
  query: string;
  startTimestamp: number;
  endTimestamp: number;
  userId?: string;
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
    this.client = client || new APIClient();
  }

  initClient(client?: APIClient) {
    this.client = client || new APIClient();
  }

  reserveUrl(
    siteId: string,
    recordingData: RecordingData,
  ): Promise<{ URL: string; key: string }> {
    return this.client
      .put(`/${siteId}/assist/save`, recordingData)
      .then((r) => r.json().then((j) => j.data));
  }

  saveFile(url: string, file: Blob) {
    return fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'video/webm' },
      body: file,
    }).then(() => true);
  }

  confirmFile(
    siteId: string,
    recordingData: RecordingData,
    key: string,
  ): Promise<any> {
    return this.client
      .put(`/${siteId}/assist/save/done`, { ...recordingData, key })
      .then((r) => r.json().then((j) => j.data));
  }

  fetchRecordings(filters: FetchFilter): Promise<any> {
    return this.client
      .post('/assist/records', filters)
      .then((r) => r.json().then((j) => j.data));
  }

  fetchRecording(id: number | string): Promise<IRecord> {
    return this.client
      .get(`/assist/records/${id}`)
      .then((r) => r.json().then((j) => j.data));
  }

  updateRecordingName(id: number, name: string): Promise<IRecord> {
    return this.client
      .post(`/assist/records/${id}`, { name })
      .then((r) => r.json().then((j) => j.data));
  }

  deleteRecording(id: number): Promise<any> {
    return this.client
      .delete(`/assist/records/${id}`)
      .then((r) => r.json().then((j) => j.data));
  }

  triggerExport = async (
    sessionId: string,
  ): Promise<{ data: { status: string } }> => {
    return this.client
      .post(`/replay-exporter/v1/PROJECT_ID/session-videos`, { sessionId })
      .then((r) => r.json());
  };

  getExports = async (
    params: Record<string, any>,
  ): Promise<ExportsResponse> => {
    return this.client
      .get(`/replay-exporter/v1/PROJECT_ID/session-videos`, { params })
      .then((r) => r.json());
  };

  getDownloadLink = async (sessionId: string): Promise<{ data: string }> => {
    return this.client
      .get(`/replay-exporter/v1/PROJECT_ID/session-videos/${sessionId}`)
      .then((r) => r.json());
  };

  deleteVideo = async (sessionId: string) => {
    return this.client
      .delete(`/replay-exporter/v1/PROJECT_ID/session-videos/${sessionId}`)
      .then((r) => r.json());
  };
}

export interface ExportsResponse {
  data: {
    videos: {
      sessionId: string;
      projectId: number;
      userId: number;
      fileUrl: string;
      status: string;
      jobId: string;
      createdAt: number;
      modifiedAt: number;
      userName: string;
    }[];
    total: number;
  };
}
