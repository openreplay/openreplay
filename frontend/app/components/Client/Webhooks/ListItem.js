import React from 'react';
import { Icon } from 'UI';
import styles from './listItem.module.css';
import { Button } from 'UI';

const ListItem = ({ webhook, onEdit, onDelete }) => {
    return (
        <div className="border-b group last:border-none hover:bg-active-blue flex items-center justify-between p-3 cursor-pointer" onClick={onEdit}>
            <div>
                <span>{webhook.name}</span>
                <div className={styles.endpoint}>{webhook.endpoint}</div>
            </div>
            <div className="invisible group-hover:visible">
                <Button variant="text-primary" icon="pencil" />
            </div>
        </div>
    );
};

export default ListItem;
