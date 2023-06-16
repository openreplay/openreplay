import React, { useEffect, useState } from 'react';
import logger from 'App/logger'
import Headers from '../Headers';
import { JSONTree, Tabs, NoContent } from 'UI';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';

const HEADERS = 'HEADERS';
const REQUEST = 'REQUEST';
const RESPONSE = 'RESPONSE';
const TABS = [HEADERS, REQUEST, RESPONSE].map((tab) => ({ text: tab, key: tab }));

function parseRequestResponse(
  r: string,
  setHeaders: (hs: Record<string, string> | null) => void,
  setJSONBody: (body: Record<string, string> | null) => void,
  setStringBody: (body: string) => void,
) {
  try {
    if (!r) {
      setHeaders(null);
      setJSONBody(null);
      setStringBody('');
      return;
    }
    const json = JSON.parse(r)
    const hs = json.headers
    const bd = json.body as string

    if (typeof hs === "object") {
      setHeaders(hs);
    } else {
      setHeaders(null);
    }
    if (!bd) {
      setJSONBody(null)
      setStringBody('')
    }
    try {
      const jBody = JSON.parse(bd)
      if (typeof jBody === "object" && jBody != null) {
        setJSONBody(jBody)
      } else {
        setStringBody(bd)
      }
    } catch {
      setStringBody(bd)
    }
  } catch(e) { logger.error("Error decoding payload json:", e, r)}
}


interface Props {
  resource: { request: string, response: string };
}
function FetchTabs({ resource }: Props) {
  const [activeTab, setActiveTab] = useState(HEADERS);
  const onTabClick = (tab: string) => setActiveTab(tab);
  const [jsonRequest, setJsonRequest] = useState<Object | null>(null);
  const [jsonResponse, setJsonResponse] = useState<Object | null>(null);
  const [stringRequest, setStringRequest] = useState<string>('');
  const [stringResponse, setStringResponse ] = useState<string>('');
  const [requestHeaders, setRequestHeaders] = useState<Record<string,string> | null>(null);
  const [responseHeaders, setResponseHeaders] = useState<Record<string,string> | null>(null);

  useEffect(() => {
    const { request, response } = resource;
    parseRequestResponse(
      request,
      setRequestHeaders,
      setJsonRequest,
      setStringRequest,
    )
    parseRequestResponse(
      response,
      setResponseHeaders,
      setJsonResponse,
      setStringResponse,
    )
  }, [resource]);

  const renderActiveTab = () => {
    switch (activeTab) {
      case REQUEST:
        return (
          <NoContent
            title={
              <div className="flex flex-col items-center justify-center">
                <AnimatedSVG name={ICONS.NO_RESULTS} size={170} />
                <div className="mt-6">
                  Body is Empty or not captured.
                  {' '}
                  <a href="https://docs.openreplay.com/installation/network-options" className="link" target="_blank">
                    Configure
                  </a>
                  {' '}
                  network capturing to get more out of fetch/XHR requests.
                </div>
              </div>
            }
            size="small"
            show={!jsonRequest && !stringRequest}
            // animatedIcon="no-results"
          >
            <div>
              <div className="mt-6">
                { jsonRequest 
                  ? <JSONTree src={jsonRequest} collapsed={false} enableClipboard />
                  : <div className="ml-3 break-words my-3"> {stringRequest} </div>
                }
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
                <AnimatedSVG name={ICONS.NO_RESULTS} size={170} />
                <div className="mt-6">
                  Body is Empty or not captured.
                  {' '}
                  <a href="https://docs.openreplay.com/installation/network-options" className="link" target="_blank">
                    Configure
                  </a>
                  {' '}
                  network capturing to get more out of fetch/XHR requests.
                </div>
              </div>
            }
            size="small"
            show={!jsonResponse && !stringResponse}
            // animatedIcon="no-results"
          >
            <div>
              <div className="mt-6">
                { jsonResponse 
                  ? <JSONTree src={jsonResponse} collapsed={false} enableClipboard />
                  : <div className="ml-3 break-words my-3"> {stringResponse} </div>  
                }
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
      <div style={{ height: 'calc(100vh - 364px)', overflowY: 'auto' }}>{renderActiveTab()}</div>
    </div>
  );
}

export default FetchTabs;
