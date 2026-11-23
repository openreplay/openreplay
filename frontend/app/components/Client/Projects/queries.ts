import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { runInAction } from 'mobx';

import { useStore } from 'App/mstore';
import CustomField from 'App/mstore/types/customField';
import { customFieldService, sessionService } from 'App/services';

export interface CaptureSettings {
  rate: number;
  conditionalCapture: boolean;
  conditions: { name: string; captureRate: number; filters: any[] }[];
}

const CACHE_MS = 5 * 60 * 1000;

export const projectSettingsKeys = {
  capture: (projectId: number) => ['project-settings', projectId, 'capture'],
  metadata: (siteId: string) => ['project-settings', siteId, 'metadata'],
  filters: (siteId: string) => ['project-settings', siteId, 'filters'],
};

export function useCaptureSettings(projectId: number) {
  return useQuery({
    queryKey: projectSettingsKeys.capture(projectId),
    queryFn: (): Promise<CaptureSettings> =>
      sessionService.fetchCaptureConditions(projectId),
    staleTime: CACHE_MS,
  });
}

export function useSaveCaptureSettings(projectId: number) {
  const queryClient = useQueryClient();
  const { projectsStore } = useStore();
  return useMutation({
    mutationFn: (data: CaptureSettings): Promise<CaptureSettings> =>
      sessionService
        .saveCaptureConditions(projectId, data)
        .then((r) => r.json())
        .then((j) => j.data),
    onSuccess: (data) => {
      queryClient.setQueryData(projectSettingsKeys.capture(projectId), data);
      projectsStore.syncProjectInList({
        id: `${projectId}`,
        sampleRate: data.rate,
      });
    },
  });
}

/** Loads the project's filter catalogue into filterStore, where condition
    sets are parsed against and picked from. */
export function useProjectFilters(siteId: string, enabled: boolean) {
  const { filterStore } = useStore();
  return useQuery({
    queryKey: projectSettingsKeys.filters(siteId),
    queryFn: () => filterStore.fetchFilters(siteId).then(() => true),
    enabled,
    staleTime: CACHE_MS,
  });
}

export function useMetadataKeys(siteId: string) {
  return useQuery({
    queryKey: projectSettingsKeys.metadata(siteId),
    queryFn: (): Promise<CustomField[]> =>
      customFieldService
        .get(siteId)
        .then((list: any[]) => list.map((item) => new CustomField(item))),
    staleTime: CACHE_MS,
  });
}

export function useMetadataMutations(siteId: string) {
  const queryClient = useQueryClient();
  const { projectsStore, customFieldStore } = useStore();
  const key = projectSettingsKeys.metadata(siteId);
  const update = (fn: (list: CustomField[]) => CustomField[]) => {
    queryClient.setQueryData<CustomField[]>(key, (list = []) => fn(list));
    // the session filters hold the active project's keys; Projects rebuilds them on leave
    if (siteId === projectsStore.activeSiteId)
      runInAction(() => {
        customFieldStore.changed = true;
      });
  };

  const save = useMutation({
    mutationFn: (field: CustomField) =>
      field.exists()
        ? customFieldService.update(siteId, field.toData())
        : customFieldService.create(siteId, field.toData()),
    onSuccess: (data, field) => {
      const saved = new CustomField(data);
      update((list) =>
        field.exists()
          ? list.map((f) => (f.index === field.index ? saved : f))
          : [...list, saved],
      );
    },
  });

  const remove = useMutation({
    mutationFn: (index: string) => customFieldService.delete(siteId, index),
    onSuccess: (_, index) =>
      update((list) => list.filter((f) => f.index !== index)),
  });

  return { save, remove };
}
