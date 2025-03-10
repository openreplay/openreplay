import React, { useEffect, useState } from 'react';
import logger from 'App/logger';
import { JSONTree, Tabs, NoContent } from 'UI';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import Headers from '../Headers';
import { useTranslation } from 'react-i18next';
import { TFunction } from 'i18next';

const HEADERS = 'HEADERS';
const REQUEST = 'REQUEST';
const RESPONSE = 'RESPONSE';
const TABS = [HEADERS, REQUEST, RESPONSE].map((tab) => ({
  text: tab,
  key: tab,
}));

type RequestResponse = {
  headers?: Record<string, string>;
  body?: any;
};

function parseRequestResponse(
  r: string,
  setHeaders: (hs: Record<string, string> | null) => void,
  setJSONBody: (body: Record<string, unknown> | null) => void,
  setStringBody: (body: string) => void,
  t: TFunction,
): void {
  try {
    if (!r) {
      setHeaders(null);
      setJSONBody(null);
      return;
    }

    let parsed: RequestResponse;
    try {
      parsed = JSON.parse(r);
    } catch (e) {
      logger.error(t('Error parsing request string as JSON:'), e);
      setHeaders(null);
      setJSONBody(null);
      return;
    }

    const { headers, body } = parsed;

    // Set headers if headers is a non-null object and not an array.
    if (headers && typeof headers === 'object' && !Array.isArray(headers)) {
      setHeaders(headers);
    } else {
      setHeaders(null);
    }

    // If body is not present, set it as null for JSON and an empty string for string body.
    if (body === undefined || body === null) {
      setJSONBody(null);
      setStringBody('');
    } else if (typeof body === 'string') {
      // Try to parse the body as JSON, if it fails, set it as a string body.
      try {
        const jBody = JSON.parse(body);
        setJSONBody(jBody);
      } catch {
        setStringBody(body);
      }
    } else {
      // If body is an object but not a string, it's already in JSON format.
      setJSONBody(body as Record<string, unknown>);
    }
  } catch (e) {
    logger.error(t('Error decoding payload json:'), e, r);
  }
}

interface Props {
  resource: { request: string; response: string };
  isSpot?: boolean;
}
function FetchTabs({ resource, isSpot }: Props) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(HEADERS);
  const onTabClick = (tab: string) => setActiveTab(tab);
  const [jsonRequest, setJsonRequest] = useState<object | null>(null);
  const [jsonResponse, setJsonResponse] = useState<object | null>(null);
  const [stringRequest, setStringRequest] = useState<string>('');
  const [stringResponse, setStringResponse] = useState<string>('');
  const [requestHeaders, setRequestHeaders] = useState<Record<
    string,
    string
  > | null>(null);
  const [responseHeaders, setResponseHeaders] = useState<Record<
    string,
    string
  > | null>(null);

  useEffect(() => {
    const { request, response } = resource;
    parseRequestResponse(
      request,
      setRequestHeaders,
      setJsonRequest,
      setStringRequest,
      t,
    );
    parseRequestResponse(
      response,
      setResponseHeaders,
      setJsonResponse,
      setStringResponse,
      t,
    );
  }, [resource]);

  const renderActiveTab = () => {
    switch (activeTab) {
      case REQUEST:
        return (
          <NoContent
            title={
              <div className="flex flex-col items-center justify-center">
                <AnimatedSVG name={ICONS.NO_RESULTS} size={30} />
                <div className="mt-6 text-base font-normal">
                  {t('Body is empty or not captured.')}{' '}
                  <a href="https://docs.openreplay.com/en/sdk/network-options" className="link" target="_blank">
                    {t('Configure')}
                  </a>
                  {' '}
                  {t(
                    'network capturing to get more out of Fetch/XHR requests.',
                  )}
                </div>
              </div>
            }
            size="small"
            show={!isSpot && !jsonRequest && !stringRequest}
            // animatedIcon="no-results"
          >
            <div>
              <div className="mt-6">
                {jsonRequest ? (
                  <JSONTree
                    src={jsonRequest}
                    collapsed={false}
                    enableClipboard
                  />
                ) : (
                  <div className="ml-3 break-words my-3"> {stringRequest} </div>
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
                <AnimatedSVG name={ICONS.NO_RESULTS} size={30} />
                <div className="mt-6 text-base font-normal">
                  {t('Body is empty or not captured.')}{' '}
                  <a href="https://docs.openreplay.com/en/sdk/network-options" className="link" target="_blank">
                    {t('Configure')}
                  </a>
                  {' '}
                  {t(
                    'network capturing to get more out of Fetch/XHR requests.',
                  )}
                </div>
              </div>
            }
            size="small"
            show={!isSpot && !jsonResponse && !stringResponse}
            // animatedIcon="no-results"
          >
            <div>
              <div className="mt-6">
                {jsonResponse ? (
                  <JSONTree
                    src={jsonResponse}
                    collapsed={false}
                    enableClipboard
                  />
                ) : (
                  <div className="ml-3 break-words my-3" />
                )}
              </div>
              <div className="divider" />
            </div>
          </NoContent>
        );
      case HEADERS:
        return (
          <Headers
            requestHeaders={requestHeaders}
            responseHeaders={responseHeaders}
          />
        );
    }
  };
  return (
    <div>
      <Tabs tabs={TABS} active={activeTab} onClick={onTabClick} border />
      <div style={{ height: 'calc(100vh - 364px)', overflowY: 'auto' }}>
        {renderActiveTab()}
      </div>
    </div>
  );
}

export default FetchTabs;
