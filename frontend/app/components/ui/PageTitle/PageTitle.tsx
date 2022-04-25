import React from 'react';
import cn from 'classnames';    

function PageTitle({ title, className = '' }) {
    return (
        <h1 className={cn("text-2xl", className)}>
            {title}
        </h1>
    );
}

export default PageTitle;