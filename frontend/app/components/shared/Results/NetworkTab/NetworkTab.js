import React, { useState } from 'react'
import { SlideModal, Label, Icon } from 'UI';
import { connect } from 'react-redux'
import cn from 'classnames';
import NetworkContent from '../../../Session_/Network/NetworkContent'
import FetchDetails from '../../../Session_/Fetch/FetchDetails';
import stl from './networkTab.css';

const HEEADER_HEIGHT = 590;

function NetworkTab(props) {
  const { run, className } = props;
  const requests = run.resources;
  const [current, setCurrent] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0) - HEEADER_HEIGHT;  

  const downloadHarFile = () => {
    window.open(run.harfile);
  }

  const nextClickHander = () => {
    const requests = run.resources;
    if (currentIndex === requests.length  - 1) return;
    const newIndex = currentIndex + 1;
    setCurrent(requests[newIndex]);
    setCurrentIndex(newIndex);
  }

  const prevClickHander = () => {
    const requests = run.resources;

    if (currentIndex === 0) return;
    const newIndex = currentIndex - 1;
    setCurrent(requests[newIndex]);
    setCurrentIndex(newIndex);
  }

  return (
    <div className={ className }>
      <SlideModal 
        size="middle"
        title={
          <div className="flex justify-between">
            <h1>Fetch Request</h1>
            <div className="flex items-center">
              <span className="mr-2 color-gray-medium uppercase text-base">Status</span>
              <Label
                data-red={current && current.status >= 400}
                data-green={current && current.status < 400}
              >
                <div className="uppercase w-16 justify-center code-font text-lg">{current && current.status}</div>
              </Label>
            </div>
          </div>
        }
        isDisplayed={ current != null }
        content={ current && 
          <FetchDetails
            isResult
            resource={ current }
            nextClick={nextClickHander}
            prevClick={prevClickHander}
            first={currentIndex === 0}
            last={currentIndex === requests.length - 1}
          />
        }
        onClose={ () => setCurrent(null) }
      />
      <div
        className={cn('my-3 cursor-pointer py-2 flex justify-center w-full rounded', stl.downloadButton)}
        onClick={downloadHarFile}
      >
        <Icon name="download" size="16" color="teal" />
        <span className="ml-2 color-teal font-medium">HAR Reports</span>
      </div>
      <NetworkContent
        isResult
        resources={requests}
        onRowClick={ (e, index) => { setCurrent(e); setCurrentIndex(index)} }
        additionalHeight={vh}
        fetchPresented = { run.fetchPresented }
        
        loadTime = { run.loadTime }
        domBuildingTime = { run.domBuildingTime }        
        resourcesSize = { run.resourcesSize }
        transferredSize = { run.transferredSize }
        domContentLoadedTime = { run.domContentLoadedTime }
      />
    </div>
  )
}

export default connect(state => ({
  requests: state.getIn([ 'tests', 'sampleRun', 'resources'])
}))(NetworkTab)
