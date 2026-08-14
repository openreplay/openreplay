import { Divider } from 'antd';
import React from 'react';

import {
  useEnvironments,
  useSettings,
  useUpdateEnvironment,
  useUpdateSettings,
} from '../queries';
import Defaults from './Defaults';
import Environments from './Environments';
import { Resolution, RunDefaults } from './shared/types';
import { LOOKUP_LIMIT } from './shared/utils';

// The Tests page's "Environments" tab: run defaults + the environments list. Run
// defaults persist to GET/PATCH /settings, the default environment to the env flagged
// `isDefault`.
function SettingsTab() {
  const { data: settings } = useSettings();
  const { data: envData } = useEnvironments({ limit: LOOKUP_LIMIT });
  const updateSettings = useUpdateSettings();
  const updateEnv = useUpdateEnvironment();

  const defaultEnv = (envData?.items ?? []).find((e) => e.isDefault);
  const defaults: RunDefaults = {
    envId: defaultEnv?.environmentId,
    resolution: (settings?.defaultViewport as Resolution) || undefined,
    region: settings?.defaultRegion || undefined,
  };

  const changeDefaults = (patch: Partial<RunDefaults>) => {
    // viewport / region → project settings ("" clears to null)
    if ('resolution' in patch)
      updateSettings.mutate({ defaultViewport: patch.resolution ?? '' });
    if ('region' in patch)
      updateSettings.mutate({ defaultRegion: patch.region ?? '' });
    // default environment → the env's `isDefault` flag. The PUT replaces name/baseUrl/
    // variables, so send them back unchanged; setting one true demotes the prior.
    if ('envId' in patch) {
      const target = (envData?.items ?? []).find(
        (e) => e.environmentId === patch.envId,
      );
      const demote = patch.envId == null && defaultEnv ? defaultEnv : undefined;
      const env = target ?? demote;
      if (env)
        updateEnv.mutate({
          environmentId: env.environmentId,
          body: {
            name: env.name,
            baseUrl: env.baseUrl,
            variables: env.variables,
            isDefault: !!target,
          },
        });
    }
  };

  return (
    <div className="flex flex-col p-5 w-full">
      <Environments />
      <Divider />
      <Defaults value={defaults} onChange={changeDefaults} />
    </div>
  );
}

export default SettingsTab;
