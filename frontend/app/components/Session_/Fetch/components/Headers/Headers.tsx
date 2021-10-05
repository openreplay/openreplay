import React from 'react'
import { NoContent, TextEllipsis } from 'UI'
import stl from './headers.css'

function Headers(props) {
  return (
    <div>
      <NoContent
        title="No data available."
        size="small"
        show={ !props.requestHeaders && !props.responseHeaders }
        icon="exclamation-circle"
      >
        { props.requestHeaders && (
          <>
            <div className="mb-4 mt-4">
              <div className="my-2 font-medium">Request Headers</div>
              {
                Object.keys(props.requestHeaders).map(h => (
                  <div className={stl.row}>
                    <div className="mr-2 font-medium">{h}:</div>
                    <div className="flex-1">
                      <TextEllipsis text={props.requestHeaders[h]} />
                    </div>
                  </div>
                ))
              }
            </div>
            <hr />
          </>
        )}
        
        { props.responseHeaders && (
          <div className="mt-4">
            <div className="my-2 font-medium">Response Headers</div>
            {
              Object.keys(props.responseHeaders).map(h => (
                <div className={stl.row}>
                  <div className="mr-2 font-medium">{h}:</div>
                  <div>{props.responseHeaders[h]}</div>
                </div>
              ))
            }
          </div>
        )}
      </NoContent>
    </div>
  );
}

export default Headers;