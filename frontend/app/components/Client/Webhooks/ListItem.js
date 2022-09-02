import React from 'react';
import { Button } from 'UI';

const ListItem = ({ webhook, onEdit, onDelete }) => {
    return (
        <div className="border-t group hover:bg-active-blue flex items-center justify-between py-3 px-5 cursor-pointer" onClick={onEdit}>
            <div>
                <span>{webhook.name}</span>
                <div className="color-gray-medium">{webhook.endpoint}</div>
            </div>
            <div className="invisible group-hover:visible">
                <Button variant="text-primary" icon="pencil" />
            </div>
        </div>
    );
};

export default ListItem;
