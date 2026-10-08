import { toast } from '@/ui/overlays/toast';
import withPageTitle from 'HOCs/withPageTitle';
import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { userService } from 'App/services';

import { modules as list } from '.';
import { PrefBlock, PrefList, PrefListRow, PrefToggle } from '../PrefSection';

const NO_MODULES: string[] = [];

function Modules() {
  const { t, i18n } = useTranslation();
  const { userStore } = useStore();
  const { updateModule } = userStore;
  // a stable empty list: a fresh `[]` each render re-ran the effect below,
  // which set state, which rendered again — forever
  const modules: string[] = userStore.account.settings?.modules ?? NO_MODULES;
  const isEnterprise = userStore.isEnterprise;
  const [modulesState, setModulesState] = React.useState<any[]>([]);

  const onToggle = async (module: any) => {
    try {
      const isEnabled = !module.isEnabled;
      module.isEnabled = isEnabled;
      setModulesState((prevState) => [...prevState]);
      await userService.saveModules({
        module: module.key,
        status: isEnabled,
      });
      updateModule(module.key);
      toast.success(
        `${t('Module')} ${module.label} ${!isEnabled ? t('enabled') : t('disabled')}`,
      );
    } catch (err) {
      console.error(err);
      toast.error(
        `${t('Failed to')} ${module.isEnabled ? t('disable') : t('enable')} module ${module.label}`,
      );
      module.isEnabled = !module.isEnabled;
      setModulesState((prevState) => [...prevState]);
    }
  };

  useEffect(() => {
    const moduleList = list(t);
    moduleList.forEach((module) => {
      module.isEnabled = modules.includes(module.key);
    });
    setModulesState(
      moduleList.filter(
        (module) => !module.hidden && (!module.enterprise || isEnterprise),
      ),
    );
  }, [modules, i18n.language]);

  return (
    <PrefBlock
      flush
      title={t('Product features')}
      hint={t(
        "OpenReplay's modules are advanced features you can switch on or off for this workspace.",
      )}
    >
      <PrefList>
        {modulesState.map((module) => (
          <PrefListRow
            key={module.key}
            title={module.label}
            sub={module.description}
            control={
              <PrefToggle
                checked={!module.isEnabled}
                onChange={() => void onToggle(module)}
                label={!module.isEnabled ? t('On') : t('Off')}
              />
            }
          />
        ))}
      </PrefList>
    </PrefBlock>
  );
}

export default withPageTitle('Modules - OpenReplay Preferences')(
  observer(Modules),
);
