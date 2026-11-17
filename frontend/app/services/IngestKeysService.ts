import BaseService from './BaseService';

/** OTLP/HTTP logs route on the ingest service; auth is `Authorization: Bearer <key>`. */
export const OTLP_LOGS_PATH = '/v1/otlp/v1/logs';

export const INGEST_KEY_NAME_MAX_LENGTH = 100;

export interface IngestKey {
  keyId: number;
  projectId: number;
  /** full secret, present only in the create response */
  key?: string;
  /** first 8 chars of the secret */
  prefix: string;
  name: string;
  /** ISO timestamp, UTC */
  createdAt: string;
  revokedAt: string | null;
}

export default class IngestKeysService extends BaseService {
  /** Revoked keys included, newest first. */
  list = async (): Promise<IngestKey[]> => {
    const r = await this.client.get('/PROJECT_ID/ingest-keys');
    const { data } = await r.json();
    return data ?? [];
  };

  create = async (name: string): Promise<IngestKey> => {
    const r = await this.client.post('/PROJECT_ID/ingest-keys', { name });
    const { data } = await r.json();
    return data;
  };

  revoke = async (keyId: number): Promise<void> => {
    await this.client.delete(`/PROJECT_ID/ingest-keys/${keyId}`);
  };
}
