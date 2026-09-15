import { client } from 'App/mstore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
    `/${projectId}/integration/${name}`,
  );
  return r.json();
}

export function useIntegration<T>(
  name: ServiceName,
  projectId: string,
  initialValues: T,
) {
  const queryClient = useQueryClient();
  const queryKey = ['integrationData', projectId, name];
  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const { data, isPending } = useQuery({
    queryKey,
    queryFn: async () => {
      const resp = await getIntegrationData<T>(name, projectId);
      if (resp) {
        return resp;
      }
      return initialValues;
    },
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
    onSuccess: invalidate,
  });
  const removeMutation = useMutation({
    mutationFn: ({ siteId }: { siteId: string }) =>
      removeIntegration(name, siteId),
    onSuccess: invalidate,
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
      `/${projectId}/integration/${name}`,
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
      `/${projectId}/integration/${name}`,
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
