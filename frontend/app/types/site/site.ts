import GDPR, { IGDPR } from './gdpr';

export interface ISite {
  id?: string;
  name: string;
  host: string;
  platform: string;
  lastRecordedSessionAt: any;
  gdpr: IGDPR;
  recorded: boolean;
  stackIntegrations: boolean;
  projectKey?: string;
  projectId?: number;
  trackerVersion?: string;
  saveRequestPayloads: boolean;
  sampleRate: number;
  conditionsCount: number;
}

export default function Site(data: Partial<ISite>): ISite {
  const defaults: ISite = {
    id: undefined,
    name: '',
    host: '',
    platform: 'web',
    lastRecordedSessionAt: undefined,
    gdpr: GDPR(),
    recorded: false,
    stackIntegrations: false,
    projectKey: undefined,
    projectId: undefined,
    trackerVersion: undefined,
    saveRequestPayloads: false,
    sampleRate: 0,
    conditionsCount: 0,
  };

  return {
    ...defaults,
    ...data,
    id: data?.projectId?.toString(),
    gdpr: GDPR(data ? data.gdpr : undefined),
    host: data ? data.name : '',
  };
}
