import React from 'react';
import { Button, Label } from 'UI';
import stl from './listItem.css';

const ListItem = ({ announcement, onButtonClick }) => {
  return (
    <div className={stl.wrapper}>
      <div className="flex justify-between items-center mb-3">
        <div className="text-sm">{announcement.createdAt && announcement.createdAt.toFormat('LLL dd, yyyy')}</div>
        <Label><span className="capitalize">{announcement.type}</span></Label>
      </div>
      {announcement.imageUrl &&
        <img className="w-full border mb-3" src={announcement.imageUrl} />
      }
      <div>
        <h2 className="text-xl mb-2">{announcement.title}</h2>
        <div className="mb-2 text-sm text-justify">{announcement.description}</div>
        {announcement.buttonUrl &&           
          <Button
            primary outline size="small"
            onClick={() => onButtonClick(announcement.buttonUrl) }
          >
            <span className="capitalize">{announcement.buttonText}</span>
          </Button>          
        }
      </div>
    </div>
  )
}

export default ListItem
