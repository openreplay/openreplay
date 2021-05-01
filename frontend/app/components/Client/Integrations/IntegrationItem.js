import React from 'react';
import cn from 'classnames';
import { Icon } from 'UI';
import stl from './integrationItem.css';

const onDocLinkClick = (e, link) => {
  e.stopPropagation();
  window.open(link, '_blank');
}

const IntegrationItem = ({
  deleteHandler = null, icon, url = null, title = '', description = '', onClick = null, dockLink = '', integrated = false
}) => {
  return (
    <div className={ cn(stl.wrapper, 'mb-4', { [stl.integrated] : integrated })} onClick={ e => onClick(e, url) }>
      {integrated && (
        <div className="m-2 absolute right-0 top-0 h-4 w-4 rounded-full bg-teal flex items-center justify-center">
          <Icon name="check" size="14" color="white" />
        </div>
      )}
      <Icon name={ icon } size="40" />
      <h4 className="my-2">{ title }</h4>
    </div>
  )
};

export default IntegrationItem;
