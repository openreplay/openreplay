import React from 'react'
import { NoContent, TextEllipsis } from 'UI'
import stl from './headers.module.css'
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';

function Headers(props) {
  return (
    <div>
      <NoContent
        title={
          <div className="flex flex-col items-center justify-center">
            <AnimatedSVG name={ICONS.NO_RESULTS} size="170" />
            <div className="mt-6 text-2xl">No data available.</div>
          </div>
        }
        size="small"
        show={ !props.requestHeaders && !props.responseHeaders }
        // animatedIcon="no-results"
      >
        { props.requestHeaders && (
          <>
            <div className="mb-4 mt-4">
              <div className="my-2 font-medium">Request Headers</div>
              {
                Object.keys(props.requestHeaders).map(h => (
                  <div className={stl.row}>
                    <span className="mr-2 font-medium">{h}:</span>
                    <span>{props.requestHeaders[h]}</span>
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
                  <span className="mr-2 font-medium">{h}:</span>
                  <span>{props.responseHeaders[h]}</span>
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