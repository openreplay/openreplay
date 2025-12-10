import React from 'react';
import Event from 'Components/DataManagement/Activity/data/Event'

function UserProperty() {
  const testEv = new Event({
    name: '$broswerthing',
    displayName: 'Browser Thing',
    description: 'The browser the user is using',
    customFields: {
      exampleValue: 'Chrome',
      type: 'String',
    }
  })
  return (
    <div className="border rounded-lg flex flex-col gap-4 w-full mx-auto" style={{ maxWidth: 1360 }}>

    </div>
  )
}