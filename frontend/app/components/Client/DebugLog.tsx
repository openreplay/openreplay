import React from 'react'
import { KEY, options } from 'App/dev/console'
import { Switch } from 'UI';

function getDefaults() {
  const storedString = localStorage.getItem(KEY)
  if (storedString) {
    const storedOptions = JSON.parse(storedString)
    return storedOptions.verbose
  } else {
    return false
  }
}

function DebugLog() {
  const [showLogs, setShowLogs] = React.useState(getDefaults)

  const onChange = (checked: boolean) => {
    setShowLogs(checked)
    options.logStuff(checked)
  }
  return (
    <div>
      <h3 className={'text-lg'}>Player Debug Logs</h3>
      <div className={'my-1'}>Show debug information in browser console.</div>
      <div className={'mt-2'}>
        <Switch checked={showLogs} onChange={onChange} />
      </div>
    </div>
  )
}

export default DebugLog