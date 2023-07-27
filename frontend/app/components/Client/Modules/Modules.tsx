import React from 'react';
import ModuleCard from 'Components/Client/Modules/ModuleCard';
import { modules } from './';
import withPageTitle from 'HOCs/withPageTitle';

function Modules() {
  const onToggle = (module: Module) => {
    module.isEnabled = !module.isEnabled;
  };
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
        {modules.map((module) => (
          <div key={module.key} className='flex flex-col h-full'>
            <ModuleCard module={module} onToggle={onToggle} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default withPageTitle('Modules - OpenReplay Preferences')(Modules);