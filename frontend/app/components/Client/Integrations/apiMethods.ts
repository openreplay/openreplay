import { client } from "App/mstore";
import { useQuery, useMutation } from '@tanstack/react-query';

export type ServiceName = 'datadog' | 'dynatrace' | 'elasticsearch' | 'sentry'
export const serviceNames: Record<ServiceName, string> = {
  datadog: 'Datadog',
  dynatrace: 'Dynatrace',
  elasticsearch: 'Elastic',
  sentry: 'Sentry',
};

export async function getIntegrationData<T>(name: ServiceName, projectId: string): Promise<T> {
  const r = await client.get(
    `/integrations/v1/integrations/${name}/${projectId}`
  );
  return r.json();
}

export function useIntegration<T>(name: ServiceName, projectId: string, initialValues: T) {
  const { data, isPending } = useQuery({
    queryKey: ['integrationData', name],
    queryFn: async () => {
      const resp = await getIntegrationData<T>(
        name,
        projectId
      );
      if (resp) {
        return resp;
      }
      return initialValues;
    },
    initialData: initialValues,
  });

  const saveMutation = useMutation({
    mutationFn: ({ values, siteId, exists }: {
      values: T;
      siteId: string;
      exists?: boolean;
    }) =>
      saveIntegration(name, values, siteId, exists),
  });
  const removeMutation = useMutation({
    mutationFn: ({ siteId }: {
      siteId: string;
    }) => removeIntegration(name, siteId),
  });

  return {
    data,
    isPending,
    saveMutation,
    removeMutation,
  };
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
    { data }
  );
  return r.json();
}

export async function removeIntegration(name: string, projectId: string) {
  const r = await client.delete(`/integrations/v1/integrations/${name}/${projectId}`);
  return r.json();
}
