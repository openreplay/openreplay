import React from 'react';
import { Icon, JSONTree } from 'UI';

export default class JsonViewer extends React.PureComponent {
    render() {
        const { data, title, icon } = this.props;
        const isObjectData = typeof data === 'object' && !Array.isArray(data) && data !== null
        return (
            <div className="p-5">
                <Icon name={icon} size="30" />
                <h4 className="my-5 capitalize"> {title}</h4>
                {isObjectData ? <JSONTree src={data} collapsed={false} /> : data}
            </div>
        );
    }
}
