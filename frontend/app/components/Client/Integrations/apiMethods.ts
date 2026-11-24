

import { client } from 'App/mstore';

export type ServiceName = 'datadog' | 'dynatrace' | 'elasticsearch' | 'sentry';
export const serviceNames: Record<ServiceName, string> = {
  datadog: 'Datadog',
  dynatrace: 'Dynatrace',
  elasticsearch: 'Elastic',
  sentry: 'Sentry',
};

export async function getIntegrationData<T>(
  name: ServiceName,
  projectId: string,
): Promise<T> {
  const r = await client.get(`/${projectId}/integration/${name}`);
  return r.json();
}
