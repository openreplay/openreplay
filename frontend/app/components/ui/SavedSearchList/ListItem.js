import React from 'react';
import { Icon } from 'UI';
import cn from "classnames";
import stl from './listItem.css';

const ListItem = ({icon, label, onClick, onRemove }) => {
    return (
        <div className={ cn(stl.wrapper, 'flex items-center capitalize') } onClick={ onClick }>
            <div className="flex items-center mr-auto">
                <Icon name={ icon } color="teal" size="16" />
                <span className="ml-3">{ label }</span>
            </div>
            <div className={ cn(stl.actionWrapper, "p-2")} onClick={onRemove}>
                <Icon name="trash" color="teal" size="12" />
            </div>
        </div>
    );
};

export default ListItem;
