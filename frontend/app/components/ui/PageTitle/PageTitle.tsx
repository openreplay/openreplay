import React from 'react';
import cn from 'classnames';

interface Props {
    title: React.ReactNode;
    className?: string;
    actionButton?: React.ReactNode;
    subTitle?: string;
    subTitleClass?: string;
    onDoubleClick?: () => void;
    onClick?: () => void;
}
function PageTitle({ title, actionButton = null, subTitle = '', className = '', subTitleClass, onDoubleClick, onClick }: Props) {
    return (
        <div>
            <div className='flex items-center'>
                <h1 className={cn("text-2xl capitalize-first", className)} onDoubleClick={onDoubleClick} onClick={onClick}>
                    {title}
                </h1>
                { actionButton && <div className="ml-2">{actionButton}</div> }
            </div>
            {subTitle && <h2 className={cn("my-4 font-normal color-gray-dark", subTitleClass)}>{subTitle}</h2>}
        </div>
    );
}

export default PageTitle;
