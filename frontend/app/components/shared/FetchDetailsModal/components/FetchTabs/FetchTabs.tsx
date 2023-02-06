import React, { useEffect, useState } from 'react';
import Headers from '../Headers';
import { JSONTree, Tabs, NoContent } from 'UI';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';

const HEADERS = 'HEADERS';
const REQUEST = 'REQUEST';
const RESPONSE = 'RESPONSE';
const TABS = [HEADERS, REQUEST, RESPONSE].map((tab) => ({ text: tab, key: tab }));

interface Props {
  resource: any;
}
function FetchTabs(props: Props) {
  const { resource } = props;
  const [activeTab, setActiveTab] = useState(HEADERS);
  const onTabClick = (tab: string) => setActiveTab(tab);
  const [jsonPayload, setJsonPayload] = useState(null);
  const [jsonResponse, setJsonResponse] = useState(null);
  const [requestHeaders, setRequestHeaders] = useState(null);
  const [responseHeaders, setResponseHeaders] = useState(null);

  useEffect(() => {
    const { payload, response } = resource;

    try {
      let jsonPayload = typeof payload === 'string' ? JSON.parse(payload) : payload;
      let requestHeaders = jsonPayload.headers;
      jsonPayload.body =
        typeof jsonPayload.body === 'string' ? JSON.parse(jsonPayload.body) : jsonPayload.body;
      delete jsonPayload.headers;
      setJsonPayload(jsonPayload);
      setRequestHeaders(requestHeaders);
    } catch (e) {}

    try {
      let jsonResponse = typeof response === 'string' ? JSON.parse(response) : response;
      let responseHeaders = jsonResponse.headers;
      jsonResponse.body =
        typeof jsonResponse.body === 'string' ? JSON.parse(jsonResponse.body) : jsonResponse.body;
      delete jsonResponse.headers;
      setJsonResponse(jsonResponse);
      setResponseHeaders(responseHeaders);
    } catch (e) {}
  }, [resource, activeTab]);

  const renderActiveTab = () => {
    const { payload, response } = resource;
    switch (activeTab) {
      case REQUEST:
        return (
          <NoContent
            title={
              <div className="flex flex-col items-center justify-center">
                <AnimatedSVG name={ICONS.NO_RESULTS} size="170" />
                <div className="mt-6 text-2xl">Body is Empty.</div>
              </div>
            }
            size="small"
            show={!payload}
            // animatedIcon="no-results"
          >
            <div>
              <div className="mt-6">
                {jsonPayload === undefined ? (
                  <div className="ml-3 break-words my-3"> {payload} </div>
                ) : (
                  <JSONTree src={jsonPayload} collapsed={false} enableClipboard />
                )}
              </div>
              <div className="divider" />
            </div>
          </NoContent>
        );
      case RESPONSE:
        return (
          <NoContent
            title={
              <div className="flex flex-col items-center justify-center">
                <AnimatedSVG name={ICONS.NO_RESULTS} size="170" />
                <div className="mt-6 text-2xl">Body is Empty.</div>
              </div>
            }
            size="small"
            show={!response}
            // animatedIcon="no-results"
          >
            <div>
              <div className="mt-6">
                {jsonResponse === undefined ? (
                  <div className="ml-3 break-words my-3"> {response} </div>
                ) : (
                  <JSONTree src={jsonResponse} collapsed={false} enableClipboard />
                )}
              </div>
              <div className="divider" />
            </div>
          </NoContent>
        );
      case HEADERS:
        return <Headers requestHeaders={requestHeaders} responseHeaders={responseHeaders} />;
    }
  };
  return (
    <div>
      <Tabs tabs={TABS} active={activeTab} onClick={onTabClick} border={true} />
      <div style={{ height: 'calc(100vh - 314px)', overflowY: 'auto' }}>{renderActiveTab()}</div>
    </div>
  );
}

export default FetchTabs;
