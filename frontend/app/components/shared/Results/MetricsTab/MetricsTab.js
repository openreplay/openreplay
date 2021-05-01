import React, { useEffect } from 'react'
import { Icon, NoContent, QuestionMarkHint } from 'UI'
import cn from 'classnames'
import { withRequest } from 'HOCs'
import stl from './metricsTab.css'

const IconRed = () => <div className="h-2 w-2 bg-red mr-2" />
const IconOrange = () => <div className="mr-2" style={{ borderWidth: "0 5px 7px 5px", borderColor: "transparent transparent #007bff transparent" }} />
const IconGreen = () => <div className="h-2 w-2 bg-green mr-2 rounded-full" />

const Card = ({ metric : { title, displayValue, score, description } }) => (
  <div className="border rounded text-center p-6 flex flex-col justify-center">
    <div className="text-lg mb-3 flex justify-center">
      <span className="mr-2">{title}</span>
      <QuestionMarkHint
        onHover
        content={description}
        position="top center"
        className="mr-8"
      />
    </div>
    <div className="flex items-center justify-center">
      {score < 0.5 && <IconRed /> }
      {score <= 0.9 && score >= 0.5 && <IconOrange /> }
      {score > 0.9 && <IconGreen /> }
      <div className="text-2xl font-medium">{displayValue}</div>
    </div>
  </div>
)

function MetricsTab({ run, className, fetchMetrics }) {
  const downloadFile = () => {
    window.open(run.lighthouseHtmlFile);
  }

  useEffect(() => {
    // fetchMetrics();
  }, [])

  return (
    <div className={className}>
      <div className="flex items-center -mx-4">
        <div className="flex items-center w-8/12 justify-between px-24 mx-4 bg-gray-lightest rounded h-10">
          <div className="font-medium">Score</div>
          <div className="flex items-center">
            <IconRed />
            <div>{'< 0.5'}</div>
          </div>
          <div className="flex items-center">
            <IconOrange />
            <div>{'0.5 - 0.9'}</div>
          </div>
          <div className="flex items-center">
            <IconGreen />
            <div>{'> 0.9'}</div>
          </div>
        </div>
        <div
          className={cn('my-3 cursor-pointer py-2 w-4/12 mx-4 h-10 flex justify-center rounded bg-teal-light', stl.downloadButton)}
          onClick={downloadFile}
        >
          <Icon name="download" size="16" color="teal" />
          <span className="ml-2 color-teal font-medium">Lighthouse Report</span>
        </div>
      </div>
      <NoContent
        title="No data available."
        size="small"
        show={ !run.auditsPerformance && !run.auditsAd }
      >
        <div className="mt-4">
          <h2 className="text-xl mb-2">Performance</h2>
          <div className="grid grid-cols-3 gap-4 mt-4">          
            { run.auditsPerformance && Object.keys(run.auditsPerformance).map(i => {
              const metric = run.auditsPerformance[i];
              if (!metric) return;

              return (
                <Card metric={metric} title={metric.title} value={metric.displayValue} score={metric.score} hint={metric.description} />
              )
            })}
          </div>
        </div>
        
        <div className="mt-6">
          <h2 className="text-xl mb-2">Ads</h2>
          <div className="grid grid-cols-3 gap-4 mt-4">          
            { run.auditsAd && Object.keys(run.auditsAd).map(i => {
              const metric = run.auditsAd[i];
              if (!metric) return;

              return (
                <Card metric={metric} title={metric.title} value={metric.displayValue} score={metric.score} hint={metric.description} />
              )
            })}
          </div>
        </div>
      </NoContent>
    </div>
  )
}

export default withRequest({
	dataName: "metrics",
  initialData: false,
  dataWrapper: data => data.state,
	requestName: "fetchMetrics",
	endpoint: '/integrations/elasticsearch/test',
	method: 'POST',
})(MetricsTab)
