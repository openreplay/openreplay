import { client } from 'App/mstore';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'react-toastify';

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
  const r = await client.get(
    `/integrations/v1/integrations/${name}/${projectId}`,
  );
  return r.json();
}

export function useIntegration<T>(
  name: ServiceName,
  projectId: string,
  initialValues: T,
) {
  const { data, isPending } = useQuery({
    queryKey: ['integrationData', name],
    queryFn: async () => {
      const resp = await getIntegrationData<T>(name, projectId);
      if (resp) {
        return resp;
      }
      return initialValues;
    },
    initialData: initialValues,
    retry: (failureCount, error) => {
      const status = error.status || error.response.status;
      if (status === 404) {
        return false;
      }
      return failureCount < 4;
    },
  });

  const saveMutation = useMutation({
    mutationFn: ({
      values,
      siteId,
      exists,
    }: {
      values: T;
      siteId: string;
      exists?: boolean;
    }) => saveIntegration(name, values, siteId, exists),
  });
  const removeMutation = useMutation({
    mutationFn: ({ siteId }: { siteId: string }) =>
      removeIntegration(name, siteId),
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
  exists?: boolean,
) {
  const method = exists ? 'patch' : 'post';
  try {
    const r = await client[method](
      `/integrations/v1/integrations/${name}/${projectId}`,
      { data },
    );
    if (r.ok) {
      toast.success(`${name} integration saved`);
    } else {
      toast.error(`Failed to save ${name} integration`);
    }
    return r.ok;
  } catch (e) {
    console.error(e);
    if (e.response.status === 422) {
      toast.error(`Invalid credentials for ${name}`);
    } else {
      toast.error(`Failed to save ${name} integration`);
    }
  }
}

export async function removeIntegration(name: string, projectId: string) {
  try {
    const r = await client.delete(
      `/integrations/v1/integrations/${name}/${projectId}`,
    );
    if (r.ok) {
      toast.success(`${name} integration removed`);
    } else {
      toast.error(`Failed to remove ${name} integration`);
    }
    return r.ok;
  } catch (e) {
    console.error(e);
    toast.error(`Failed to remove ${name} integration`);
  }
}
