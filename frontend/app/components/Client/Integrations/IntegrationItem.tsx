import React from 'react';
import cn from 'classnames';
import { Icon } from 'UI';
import stl from './integrationItem.module.css';
import { Tooltip } from 'antd';

interface Props {
  integration: any;
  onClick?: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
  integrated?: boolean;
  hide?: boolean;
}

const IntegrationItem = (props: Props) => {
  const { integration, integrated, hide = false } = props;
  return hide ? <></> : (
    <div
      className={cn('flex flex-col border rounded-lg p-3 bg-white relative justify-between cursor-pointer hover:bg-active-blue')}
      onClick={(e) => props.onClick(e)}
      style={{ height: '136px' }}
    >
      <div className='flex gap-3'>
        {/*{integration.icon.length ?*/}
        {/*  <img className='h-10 w-10' src={'/assets/' + integration.icon + '.svg'} alt='integration' /> :*/}
        {/*  (<span style={{ fontSize: '3rem', lineHeight: '3rem' }}>{integration.header}</span>)}*/}
        <div className="shrink-0">
          <img className='h-10 w-10' src={'/assets/' + integration.icon + '.svg'} alt='integration' />
        </div>
        <div className='flex flex-col'>
          <h4 className='text-lg'>{integration.title}</h4>
          <p className='text-sm color-gray-medium m-0 p-0 h-3'>{integration.subtitle && integration.subtitle}</p>
        </div>
      </div>

      {integrated && (
        <Tooltip title='Integrated' delay={0}>
          <div className='ml-12 p-1 flex items-center justify-center color-tealx border rounded w-fit'>
            <Icon name='check-circle-fill' size='14' color='tealx' className="mr-2" />
            <span>Installed</span>
          </div>
        </Tooltip>
      )}
    </div>
  );
};

export default IntegrationItem;
