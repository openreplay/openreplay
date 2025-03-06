export interface IGDPR {
  id?: number;
  maskEmails: boolean;
  maskNumbers: boolean;
  defaultInputMode: string;
  sampleRate: number;
}

export default function GDPR(data?: Partial<IGDPR>): IGDPR {
  const defaults: IGDPR = {
    id: undefined,
    maskEmails: false,
    maskNumbers: false,
    defaultInputMode: 'plain',
    sampleRate: 0,
  };
  return { ...defaults, ...data };
}
