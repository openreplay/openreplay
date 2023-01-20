import React, { useState } from 'react'
import ErrorFrame from './ErrorFrame'
import { IconButton, Icon } from 'UI';

const docLink = 'https://docs.openreplay.com/installation/upload-sourcemaps';

interface Props {
  error: any,
  errorStack: any,
}
function ErrorDetails({ className, name = "Error", message, errorStack, sourcemapUploaded }: any) {
  const [showRaw, setShowRaw] = useState(false)
  const firstFunc = errorStack.first() && errorStack.first().function

  const openDocs = () => {
    window.open(docLink, '_blank');
  }

  return (
    <div className={className} >
      { !sourcemapUploaded && (
        <div
          style={{ backgroundColor: 'rgba(204, 0, 0, 0.1)' }}
          className="font-normal flex items-center text-sm font-regular color-red border p-2 rounded"
        >
          <Icon name="info" size="16" color="red" />
          <div className="ml-2">Source maps must be uploaded to OpenReplay to be able to see stack traces. <a href="#" className="color-red font-medium underline" style={{ textDecoration: 'underline' }} onClick={openDocs}>Learn more.</a></div>
        </div>
      ) }
      <div className="flex items-center my-3">        
        <h3 className="text-xl mr-auto">
          Stacktrace          
        </h3>
        <div className="flex justify-end mr-2">
          <IconButton
            onClick={() => setShowRaw(false) }
            label="FULL"
            plain={!showRaw}
            primaryText={!showRaw}
          />
          <IconButton
            primaryText={showRaw}
            onClick={() => setShowRaw(true) }
            plain={showRaw}
            label="RAW"
          />
        </div>
      </div>
      <div className="mb-6 code-font" data-hidden={showRaw}>
        <div className="leading-relaxed font-weight-bold">{ name }</div>
        <div style={{ wordBreak: 'break-all'}}>{message}</div>
      </div>
      { showRaw &&
        <div className="mb-3 code-font">{name} : {firstFunc ? firstFunc : '?' }</div> 
      }
      { errorStack.map((frame: any, i: any) => (
          <div className="mb-3" key={frame.key}>
            <ErrorFrame frame={frame} showRaw={showRaw} isFirst={i == 0} />
          </div>
        ))
      }
    </div>
  )
}

ErrorDetails.displayName = "ErrorDetails";
export default ErrorDetails;
