import React from 'react';
import { Icon } from 'UI';
import { Switch } from 'antd';
import { Module } from 'Components/Client/Modules/index';


interface Props {
  module: Module;
  onToggle: (module: Module) => void;
}

function ModuleCard(props: Props) {
  const { module } = props;
  return (
    <div className='bg-white rounded-lg border p-4 flex h-full'>
      <div className='w-10 shrink-0 pt-1'>
        <Icon name={module.icon} size={20} color='gray-darkest' />
      </div>
      <div className='flex flex-col flex-grow'>
        <div className='flex flex-col flex-grow'>
          <h3 className='text-lg font-medium'>{module.label}</h3>
          <p className='flex-grow'>{module.description}</p>
        </div>
        <div className='flex items-end'>
          <Switch size='small' checked={!module.isEnabled} title={module.isEnabled ? 'Enabled' : 'Disabled'}
                  onChange={() => props.onToggle(module)} />
        </div>
      </div>
    </div>
  );
}

export default ModuleCard;