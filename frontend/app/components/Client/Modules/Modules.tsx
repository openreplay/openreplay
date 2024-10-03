import React, { useEffect } from 'react';
import ModuleCard from 'Components/Client/Modules/ModuleCard';
import { modules as list } from './';
import withPageTitle from 'HOCs/withPageTitle';
import { userService } from 'App/services';
import { toast } from 'react-toastify';
import { useStore } from "App/mstore";
import { observer } from 'mobx-react-lite';

function Modules() {
  const { userStore } = useStore();
  const updateModule = userStore.updateModule;
  const modules = userStore.account.settings?.modules ?? [];
  const isEnterprise = userStore.account.edition === 'ee';
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
      toast.success(`Module ${module.label} ${!isEnabled ? 'enabled' : 'disabled'}`);
    } catch (err) {
      console.error(err);
      toast.error(`Failed to ${module.isEnabled ? 'disable' : 'enable'} module ${module.label}`);
      module.isEnabled = !module.isEnabled;
      setModulesState((prevState) => [...prevState]);
    }
  };

  useEffect(() => {
    list.forEach((module) => {
      module.isEnabled = modules.includes(module.key);
    });
    setModulesState(list.filter((module) => !module.hidden && (!module.enterprise || isEnterprise)));
  }, [modules]);


  return (
    <div>
      <div className='bg-white rounded-lg border shadow-sm p-4'>
        <h3 className='text-2xl'>Modules</h3>
        <ul className='mt-3 ml-4 list-disc'>
          <li>OpenReplay's modules are a collection of advanced features that provide enhanced functionality.</li>
          <li>Easily enable any desired module within the user interface to access its capabilities</li>
        </ul>
      </div>

      <div className='mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'>
        {modulesState.map((module) => (
          <div key={module.key} className='flex flex-col h-full'>
            <ModuleCard module={module} onToggle={onToggle} />
          </div>
        ))}
      </div>
    </div>
  );
}


export default withPageTitle('Modules - OpenReplay Preferences')(observer(Modules));
