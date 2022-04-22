import React from 'react';
import cn from 'classnames';    

interface Props {
    title: string;
    className?: string;
}
function PageTitle(props: Props) {
    const { title, className = '' } = props;
    return (
        <h1 className={cn("text-2xl", className)}>
            {title}
        </h1>
    );
}

export default PageTitle;