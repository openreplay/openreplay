import React from 'react';
// @ts-ignore
import slide from 'App/svg/cheers.svg';
import { Icon, Button } from 'UI';
import Footer from './Footer'

export function Category({ name, healthOk, onClick }: { name: string; healthOk: boolean; onClick: (args: any) => void }) {
  const icon = healthOk ? ('check-circle-fill' as const) : ('exclamation-circle-fill' as const);
  return (
    <div
      className={'px-4 py-2 flex items-center gap-2 border-b cursor-pointer hover:bg-active-blue'}
      onClick={onClick}
    >
      <Icon name={icon} size={20} color={'green'} />
      {name}

      <Icon name={"chevron-right"} size={16} className={"ml-auto"} />
    </div>
  )
}

function HealthModal({ getHealth, isLoading, healthResponse }: { getHealth: () => void; isLoading: boolean; healthResponse: Record<string, any> }) {

  return (
    <div
      style={{
        width: 640,
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      }}
      className={'flex flex-col bg-white rounded border border-figmaColors-divider'}
    >
      <div
        className={
          'flex w-full justify-between items-center p-4 border-b border-figmaColors-divider'
        }
      >
        <div className={'text-xl font-semibold'}>Installation Status</div>
        <Button loading={isLoading} onClick={getHealth} icon={'arrow-repeat'} variant={'text-primary'}>
          Recheck
        </Button>
      </div>

      <div className={'flex w-full'}>
        <div className={'flex flex-col h-full'} style={{ flex: 1 }}>
          <Category name={'Databases'} healthOk={true} />
          <Category name={'Ingestion Pipeline'} healthOk={false} />
          <Category name={'Backend Services'} healthOk={false} />
          {/*<Category name={'SSL'} healthOk={true} />*/}
        </div>
        <div
          className={'bg-gray-lightest border-l w-fit border-figmaColors-divider'}
          style={{ flex: 2 }}
        >
          <img src={slide} width={392} />
        </div>
      </div>
      <div className={'p-4 w-full border-t border-figmaColors-divider'}>
        <Button variant={'primary'} className={'ml-auto'}>
          Create Account
        </Button>
      </div>
      <Footer />
    </div>
  );
}




export default HealthModal;
