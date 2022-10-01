import React from 'react';
import cn from 'classnames';
import { Icon, Popup } from 'UI';
import stl from './integrationItem.module.css';
import { connect } from 'react-redux';

interface Props {
    integration: any;
    onClick?: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
    integrated?: boolean;
    hide?: boolean;
}

const IntegrationItem = (props: Props) => {
    const { integration, integrated, hide = false } = props;
    return hide ? <></> : (
        <div className={cn(stl.wrapper, 'mb-4', { [stl.integrated]: integrated })} onClick={(e) => props.onClick(e)}>
            {integrated && (
                <div className="m-2 absolute right-0 top-0 h-4 w-4 rounded-full bg-teal flex items-center justify-center">
                    <Popup content="Integrated" delay={0}>
                        <Icon name="check" size="14" color="white" />
                    </Popup>
                </div>
            )}
            {integration.icon.length ? <img className="h-12 w-12" src={'/assets/' + integration.icon + '.svg'} alt="integration" /> : (
                <span style={{ fontSize: '3rem', lineHeight: '3rem' }}>{integration.header}</span>
            )}
            <div className="text-center mt-2">
                <h4 className="">{integration.title}</h4>
                {/* <p className="text-sm color-gray-medium m-0 p-0 h-3">{integration.subtitle && integration.subtitle}</p> */}
            </div>
        </div>
    );
};

export default connect((state: any, props: Props) => {
    const list = state.getIn([props.integration.slug, 'list']) || [];
    return {
        // integrated: props.integration.slug === 'issues' ? !!(list.first() && list.first().token) : list.size > 0,
    };
})(IntegrationItem);
