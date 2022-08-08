import React from 'react';
import { Icon } from 'UI';
import styles from './listItem.module.css';

const ListItem = ({ webhook, onEdit, onDelete }) => {
    return (
        <div className="hover:bg-active-blue border-b last:border-none" onClick={onEdit}>
            <div>
                <span>{webhook.name}</span>
                <div className={styles.endpoint}>{webhook.endpoint}</div>
            </div>
            <div className={styles.actions}>
                <div className={styles.button}>
                    <Icon name="edit" color="teal" size="16" />
                </div>
            </div>
        </div>
    );
};

export default ListItem;
