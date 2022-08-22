import React from 'react';
import cn from 'classnames';
import { Button } from 'UI';
import styles from './listItem.module.css';

const ListItem = ({ field, onEdit, disabled }) => {
    return (
        <div
            className={cn(
                'border-b group last:border-none hover:bg-active-blue flex items-center justify-between p-3 cursor-pointer',
                field.index === 0 ? styles.preDefined : '',
                {
                    [styles.disabled]: disabled,
                }
            )}
            onClick={() => field.index != 0 && onEdit(field)}
        >
            <span>{field.key}</span>
            <div className="invisible group-hover:visible" data-hidden={field.index === 0}>
                <Button variant="text-primary" icon="pencil" />
            </div>
        </div>
    );
};

export default ListItem;
