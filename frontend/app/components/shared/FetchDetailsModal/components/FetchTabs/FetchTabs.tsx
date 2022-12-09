import React, { useEffect, useState } from 'react';
import Headers from '../Headers';
import { JSONTree, Tabs, NoContent } from 'UI';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';

const HEADERS = 'HEADERS';
const REQUEST = 'REQUEST';
const RESPONSE = 'RESPONSE';
const TABS = [HEADERS, REQUEST, RESPONSE].map((tab) => ({ text: tab, key: tab }));


function isValidJSON(o: any): o is Object {
  return typeof o === "object" && o != null
}

interface Props {
  resource: any;
}
function FetchTabs(props: Props) {
  const { resource } = props;
  const [activeTab, setActiveTab] = useState(HEADERS);
  const onTabClick = (tab: string) => setActiveTab(tab);
  const [jsonRequest, setJsonRequest] = useState<Object | string | null>(null);
  const [jsonResponse, setJsonResponse] = useState<Object | string | null>(null);
  const [requestHeaders, setRequestHeaders] = useState(null);
  const [responseHeaders, setResponseHeaders] = useState(null);

  useEffect(() => {
    const { request, response } = resource;

    try {
      let jRequest = JSON.parse(request)
      setRequestHeaders(jRequest.headers);
      try {
        let jBody = JSON.parse(jRequest.body)
        jBody = isValidJSON(jBody) ? jBody : jRequest.body
        setJsonRequest(jBody)
      } catch {
        setJsonRequest(jRequest.body)
      }
    } catch {}

    try {
      let jResponse = JSON.parse(response)
      setResponseHeaders(jResponse.headers);
      try {
        let jBody = JSON.parse(jResponse.body)
        jBody = isValidJSON(jBody) ? jBody : jResponse.body
        setJsonResponse(jBody)
      } catch {
        setJsonResponse(jResponse.body)
      }
    } catch {}
  }, [resource]);

  const renderActiveTab = () => {
    const { request, response } = resource;
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
            show={!request}
            // animatedIcon="no-results"
          >
            <div>
              <div className="mt-6">
                { !isValidJSON(jsonRequest) ? (
                  <div className="ml-3 break-words my-3"> {jsonRequest || request} </div>
                ) : (
                  <JSONTree src={jsonRequest} collapsed={false} enableClipboard />
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
                { !isValidJSON(jsonResponse) ? (
                  <div className="ml-3 break-words my-3"> {jsonResponse || response} </div>
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
