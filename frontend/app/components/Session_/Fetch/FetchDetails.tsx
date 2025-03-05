import React, { useState, useEffect } from 'react';
import { JSONTree, NoContent, Tabs } from 'UI';
import { Button } from 'antd';
import cn from 'classnames';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import stl from './fetchDetails.module.css';
import Headers from './components/Headers';
import { useTranslation } from 'react-i18next';

const HEADERS = 'HEADERS';
const REQUEST = 'REQUEST';
const RESPONSE = 'RESPONSE';

const TABS = [HEADERS, REQUEST, RESPONSE].map((tab) => ({
  text: tab,
  key: tab,
}));

const FetchDetails = ({
  resource,
  nextClick,
  prevClick,
  first = false,
  last = false,
}) => {
  const [activeTab, setActiveTab] = useState(REQUEST);
  const [tabs, setTabs] = useState([]);
  const { t } = useTranslation();

  const onTabClick = (tab) => setActiveTab(tab);

  const checkTabs = () => {
    // Could add filtering logic here if needed
    // const _tabs = TABS.filter(t => {
    //   if (t.key === REQUEST && !!resource.payload) {
    //     return true;
    //   }
    //   if (t.key === RESPONSE && !!resource.response) {
    //     return true;
    //   }
    //   return false;
    // });

    const _tabs = TABS;
    setTabs(_tabs);
    setActiveTab(_tabs.length > 0 ? _tabs[0].key : null);
  };

  useEffect(() => {
    checkTabs();
  }, [resource.index]);

  const renderActiveTab = (tab) => {
    const { payload, response = resource.body } = resource;
    let jsonPayload;
    let jsonResponse;
    let requestHeaders;
    let responseHeaders;

    try {
      jsonPayload = typeof payload === 'string' ? JSON.parse(payload) : payload;
      requestHeaders = jsonPayload.headers;
      jsonPayload.body =
        typeof jsonPayload.body === 'string'
          ? JSON.parse(jsonPayload.body)
          : jsonPayload.body;
      delete jsonPayload.headers;
    } catch (e) {}

    try {
      jsonResponse =
        typeof response === 'string' ? JSON.parse(response) : response;
      responseHeaders = jsonResponse.headers;
      jsonResponse.body =
        typeof jsonResponse.body === 'string'
          ? JSON.parse(jsonResponse.body)
          : jsonResponse.body;
      delete jsonResponse.headers;
    } catch (e) {}

    switch (tab) {
      case REQUEST:
        return (
          <NoContent
            title={
              <div className="flex flex-col items-center justify-center">
                <AnimatedSVG name={ICONS.NO_RESULTS} size="60" />
                <div className="mt-4">{t('Body is Empty')}</div>
              </div>
            }
            size="small"
            show={!payload}
          >
            <div>
              <div className="mt-6">
                {jsonPayload === undefined ? (
                  <div className="ml-3 break-words my-3"> {payload} </div>
                ) : (
                  <JSONTree
                    src={jsonPayload}
                    collapsed={false}
                    enableClipboard
                  />
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
                <AnimatedSVG name={ICONS.NO_RESULTS} size="60" />
                <div className="mt-4">{t('Body is Empty')}</div>
              </div>
            }
            size="small"
            show={!response}
          >
            <div>
              <div className="mt-6">
                {jsonResponse === undefined ? (
                  <div className="ml-3 break-words my-3"> {response} </div>
                ) : (
                  <JSONTree
                    src={jsonResponse}
                    collapsed={false}
                    enableClipboard
                  />
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
      default:
        return null;
    }
  };

  const { method, url, duration } = resource;

  return (
    <div className="px-4 pb-16">
      <h5 className="mb-2">{t('URL')}</h5>
      <div className={cn(stl.url, 'color-gray-darkest')}>{url}</div>
      <div className="flex items-center mt-4">
        <div className="w-4/12">
          <div className="font-medium mb-2">{t('Method')}</div>
          <div>{method}</div>
        </div>
        <div className="w-4/12">
          <div className="font-medium mb-2">{t('Duration')}</div>
          <div>
            {parseInt(duration)}&nbsp;{t('ms')}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div>
          <Tabs tabs={tabs} active={activeTab} onClick={onTabClick} border />
          <div style={{ height: 'calc(100vh - 364px)', overflowY: 'auto' }}>
            {renderActiveTab(activeTab)}
          </div>
        </div>

        <div className="flex justify-between absolute bottom-0 left-0 right-0 p-3 border-t bg-white">
          <Button type="outline" onClick={prevClick} disabled={first}>
            {t('Prev')}
          </Button>
          <Button type="outline" onClick={nextClick} disabled={last}>
            {t('Next')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FetchDetails;
