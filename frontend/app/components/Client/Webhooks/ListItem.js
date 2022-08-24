import React from 'react';
import { Icon } from 'UI';
import styles from './listItem.module.css';
import { Button } from 'UI';

const ListItem = ({ webhook, onEdit, onDelete }) => {
    return (
        <div className="border-t group hover:bg-active-blue flex items-center justify-between py-3 px-5 cursor-pointer" onClick={onEdit}>
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
