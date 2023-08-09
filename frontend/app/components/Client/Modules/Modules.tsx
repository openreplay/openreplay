import React, { useEffect } from 'react';
import ModuleCard from 'Components/Client/Modules/ModuleCard';
import { modules as list } from './';
import withPageTitle from 'HOCs/withPageTitle';
import { connect } from 'react-redux';
import { userService } from 'App/services';
import { toast } from 'react-toastify';

interface Props {
  modules: string[];
}

function Modules(props: Props) {
  const { modules } = props;
  const [modulesState, setModulesState] = React.useState<any[]>([]);

  const onToggle = async (module: any) => {
    try {
      const isEnabled = !module.isEnabled;
      module.isEnabled = isEnabled;
      setModulesState([...modulesState]);
      await userService.saveModules({
        module: module.key,
        status: isEnabled
      });
      toast.success(`Module ${module.label} ${isEnabled ? 'enabled' : 'disabled'}`);
    } catch (err) {
      toast.error(`Failed to ${module.isEnabled ? 'disable' : 'enable'} module ${module.label}`);
      module.isEnabled = !module.isEnabled;
      setModulesState([...modulesState]);
    }
  };

  useEffect(() => {
    list.forEach((module) => {
      module.isEnabled = modules.includes(module.key);
    });
    setModulesState(list);
  }, [modules]);


  return (
    <div>
      <div className='bg-white rounded-lg border p-4'>
        <h3 className='text-2xl'>Modules</h3>
        <div className='mt-3'>
          <p>Copy
            OpenReplay's modules are a collection of advanced features that provide enhanced functionality.</p>
          <p>Easily enable any desired module within the user interface to access its capabilities</p>
        </div>
      </div>

      <div className='mt-4 grid grid-cols-3 gap-3'>
        {modulesState.map((module) => (
          <div key={module.key} className='flex flex-col h-full'>
            <ModuleCard module={module} onToggle={onToggle} />
          </div>
        ))}
      </div>
    </div>
  );
}


export default withPageTitle('Modules - OpenReplay Preferences')(connect((state: any) => ({
  modules: state.getIn(['user', 'account', 'settings', 'modules']) || []
}))(Modules));