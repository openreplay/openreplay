import React from 'react';
import cn from 'classnames';
import { Icon } from 'UI';
import stl from './integrationItem.module.css';

interface Props {
    integration: any;
    // icon: string;
    // url: string;
    // title: string;
    onClick?: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
    integrated?: boolean;
}

const IntegrationItem = (props: Props) => {
    const { integration, onClick, integrated } = props;
    return (
        <div className={cn(stl.wrapper, 'mb-4', { [stl.integrated]: integrated })} onClick={(e) => onClick(e)}>
            {integrated && (
                <div className="m-2 absolute right-0 top-0 h-4 w-4 rounded-full bg-teal flex items-center justify-center">
                    <Icon name="check" size="14" color="white" />
                </div>
            )}
            <img className="h-12 w-12" src={'/assets/' + integration.icon + '.svg'} alt="integration" />
            <div className="text-center mt-2">
                <h4 className="">{integration.title}</h4>
                <p className="text-sm color-gray-medium m-0 p-0 h-3">{integration.subtitle && integration.subtitle}</p>
            </div>
        </div>
    );
};

export default IntegrationItem;
