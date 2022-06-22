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
                        <span key={index} className="color-gray-medium">{item.label}</span>
                    );
                }
                return (
                    <div key={index} className="color-gray-darkest hover:color-teal flex items-center">
                        <Link to={item.to} className="">{item.label}</Link>
                        <span className="mx-2">/</span>
                        {/* <Icon name="chevron-right" /> */}
                    </div>
                );
            })}
        </div>
    );
}

export default Breadcrumb;