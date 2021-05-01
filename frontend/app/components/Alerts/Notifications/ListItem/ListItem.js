import React from 'react';
import { Button } from 'UI';
import stl from './listItem.css';
import cn from 'classnames';
import AlertTypeLabel from '../../AlertTypeLabel';

const ListItem = ({ alert, onClear, loading, onNavigate }) => {
  return (
    <div className={cn(stl.wrapper, 'group', { [stl.viewed] : alert.viewed })}>
      <div className="flex justify-between items-center">
        <div className="text-sm">{alert.createdAt && alert.createdAt.toFormat('LLL dd, yyyy, hh:mm a')}</div>
        <div className={ cn("invisible", { 'group-hover:visible' : !alert.viewed})} >
          <Button plain simple loading={loading} noPadding>
            <span className={ cn("text-sm color-gray-medium", { 'invisible' : loading })} onClick={onClear}>{'IGNORE'}</span>
          </Button>
        </div>
      </div>
      <AlertTypeLabel        
        type={alert.options.sourceMeta}
        filterKey={alert.filterKey}
      />
    
      <div>
        <h2 className="mb-2 flex items-center">
          {alert.title}          
        </h2>
        <div className="mb-2 text-sm text-justify break-all">{alert.description}</div>
      </div>
    </div>
  )
}

export default ListItem
