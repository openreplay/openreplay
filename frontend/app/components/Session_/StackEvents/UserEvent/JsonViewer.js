import React from 'react';
import { Icon, JSONTree } from 'UI';

export default class JsonViewer extends React.PureComponent {
  render() {
    const { data, title, icon } = this.props;
    const isObjectData = typeof data === 'object' && !Array.isArray(data) && data !== null;
    return (
      <div className="p-5 pt-0">
        <div className="flex items-center">
          <Icon name={icon} size="24" />
          <h4 className="my-5 mx-2 font-semibold text-xl"> {title}</h4>
        </div>
        {isObjectData ? (
          <JSONTree src={data} collapsed={false} />
        ) : (
          <>
            <div className="-ml-2 text-disabled-text">Payload: </div>
            <div className="mx-2">{data}</div>
          </>
        )}
      </div>
    );
  }
}
