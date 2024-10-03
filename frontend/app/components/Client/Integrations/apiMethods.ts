import { client } from "App/mstore";

export async function getIntegrationData<T>(name: string, projectId: string): Promise<T> {
  const r = await client.get(
    `/integrations/v1/integrations/${name}/${projectId}`
  );
  return r.json();
}

export async function saveIntegration<T>(
  name: string,
  data: T,
  projectId: string,
  exists?: boolean
) {
  const method = exists ? 'patch' : 'post';
  const r = await client[method](
    `/integrations/v1/integrations/${name}/${projectId}`,
    data
  );
  return r.json();
}

export async function removeIntegration(name: string, projectId: string) {
  const r = await client.delete(`/integrations/v1/integrations/${name}/${projectId}`);
  return r.json();
}
