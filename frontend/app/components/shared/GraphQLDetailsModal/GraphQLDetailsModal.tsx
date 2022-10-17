import React from 'react';
import { JSONTree, Button } from 'UI';
import cn from 'classnames';

interface Props {
  resource: any;
}
function GraphQLDetailsModal(props: Props) {
  const {
    resource: { variables, response, duration, operationKind, operationName },
    // nextClick,
    // prevClick,
    // first = false,
    // last = false,
  } = props;

  let jsonVars = undefined;
  let jsonResponse = undefined;
  try {
    jsonVars = JSON.parse(variables);
  } catch (e) {}
  try {
    jsonResponse = JSON.parse(response);
  } catch (e) {}
  const dataClass = cn('p-2 bg-gray-lightest rounded color-gray-darkest');

  return (
    <div className="p-5 bg-white h-screen overflow-y-auto" style={{ width: '500px' }}>
      <h5 className="mb-2 font-medium">{'Operation Name'}</h5>
      <div className={dataClass}>{operationName}</div>

      <div className="flex items-center gap-4 mt-4">
        <div className="w-6/12">
          <div className="mb-2 font-medium">Operation Kind</div>
          <div className={dataClass}>{operationKind}</div>
        </div>
        <div className="w-6/12">
          <div className="mb-2 font-medium">Duration</div>
          <div className={dataClass}>{duration ? parseInt(duration) : '???'} ms</div>
        </div>
      </div>

      <div style={{ height: 'calc(100vh - 314px)', overflowY: 'auto' }}>
        <div>
          <div className="flex justify-between items-start mt-6 mb-2">
            <h5 className="mt-1 mr-1 font-medium">{'Variables'}</h5>
          </div>
          <div className={dataClass}>
            {jsonVars === undefined ? variables : <JSONTree src={jsonVars} />}
          </div>
          <div className="divider" />
        </div>

        <div>
          <div className="flex justify-between items-start mt-6 mb-2">
            <h5 className="mt-1 mr-1 font-medium">{'Response'}</h5>
          </div>
          <div className={dataClass}>
            {jsonResponse === undefined ? response : <JSONTree src={jsonResponse} />}
          </div>
        </div>
      </div>

      {/* <div className="flex justify-between absolute bottom-0 left-0 right-0 p-3 border-t bg-white">
        <Button variant="outline" onClick={prevClick} disabled={first}>
          Prev
        </Button>
        <Button variant="outline" onClick={nextClick} disabled={last}>
          Next
        </Button>
      </div> */}
    </div>
  );
}

export default GraphQLDetailsModal;
