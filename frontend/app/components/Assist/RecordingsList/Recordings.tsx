import React from 'react'
import { PageTitle } from 'UI';
import RecordingsSearch from './RecordingsSearch';
import RecordingsList from './RecordingsList';

function Recordings() {

  return (
    <div style={{ maxWidth: '1300px', margin: 'auto'}} className="bg-white rounded py-4 border">
            <div className="flex items-center mb-4 justify-between px-6">
                <div className="flex items-baseline mr-3">
                    <PageTitle title="Recordings" />
                </div>
                <div className="ml-auto flex items-center">
                    <div className="ml-4 w-1/4" style={{ minWidth: 300 }}>
                        <RecordingsSearch />
                    </div>
                </div>
            </div>
            <RecordingsList />
        </div>
  )
}

export default Recordings
