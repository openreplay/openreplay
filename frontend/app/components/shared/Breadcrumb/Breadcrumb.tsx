import React from 'react';
import { Icon } from 'UI';
import { Link } from 'react-router-dom';

interface Props {
    items: any
}
function Breadcrumb(props: Props) {
    const { items } = props;
    return (
        <div className="mb-3 flex items-center text-lg">
            {items.map((item: any, index: any) => {
                if (index === items.length - 1) {
                    return (
                        <span key={index} className="color-gray-medium capitalize-first">{item.label}</span>
                    );
                }
                return (
                    <div key={index} className="color-gray-darkest hover:text-teal group flex items-center">
                        <Link to={item.to} className="flex items-center">
                            {index === 0 && <Icon name="chevron-left" size={16} className="mr-1 group-hover:fill-teal" />}
                            <span className="capitalize-first">{item.label}</span>
                        </Link>
                        <span className="mx-2">/</span>
                    </div>
                );
            })}
        </div>
    );
}

export default Breadcrumb;
