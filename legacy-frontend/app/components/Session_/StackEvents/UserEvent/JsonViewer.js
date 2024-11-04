import React from 'react';
import { Icon, JSONTree } from 'UI';

export default class JsonViewer extends React.PureComponent {
  render() {
    const { data, title, icon } = this.props;
    const isObjectData = typeof data === 'object' && !Array.isArray(data) && data !== null;
    // TODO this has to be fixed in the data @Mehdi
    if (Array.isArray(data) && data.length === 1) {
      data[0] = '';
    }
    return (
      <div>
        <div className="flex items-center">
          <Icon name={icon} size="24" />
          <h4 className="my-5 mx-2 font-semibold text-xl"> {title}</h4>
        </div>
        {isObjectData && <JSONTree src={data} collapsed={false} />}
        {!isObjectData && Array.isArray(data) && (
          <div>
            <div className="code-font mb-2">
              {typeof data[0] === 'string' ? data[0] : JSON.stringify(data[0])}
            </div>
            <JSONTree src={data[1]} collapsed={false} />
          </div>
        )}
        {typeof data === 'string' && (
          <>
            <div className="-ml-2 text-disabled-text">Payload: </div>
            <div className="mx-2">{data}</div>
          </>
        )}
      </div>
    );
  }
}
