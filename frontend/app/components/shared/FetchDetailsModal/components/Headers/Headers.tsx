import React from 'react';
import { NoContent } from 'UI';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import stl from './headers.module.css';
import { useTranslation } from 'react-i18next';

interface Props {
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
}
function Headers(props: Props) {
  const { t } = useTranslation();
  return (
    <div>
      <NoContent
        title={
          <div className="flex flex-col items-center justify-center">
            <AnimatedSVG name={ICONS.NO_RESULTS} size={30} />
            <div className="mt-6 text-base">{t('No data available')}</div>
          </div>
        }
        size="small"
        show={!props.requestHeaders && !props.responseHeaders}
        // animatedIcon="no-results"
      >
        {props.requestHeaders &&
          Object.values(props.requestHeaders).length > 0 && (
            <>
              <div className="mb-4 mt-4">
                <div className="my-2 font-medium">{t('Request Headers')}</div>
                {Object.keys(props.requestHeaders).map((h) => (
                  <div className={stl.row}>
                    <span className="mr-2 font-medium">{h}:</span>
                    <span>{props.requestHeaders[h]}</span>
                  </div>
                ))}
              </div>
              <hr />
            </>
          )}

        {props.responseHeaders &&
          Object.values(props.responseHeaders).length > 0 && (
            <div className="mt-4">
              <div className="my-2 font-medium">{t('Response Headers')}</div>
              {Object.keys(props.responseHeaders).map((h) => (
                <div className={stl.row}>
                  <span className="mr-2 font-medium">{h}:</span>
                  <span>{props.responseHeaders[h]}</span>
                </div>
              ))}
            </div>
          )}
      </NoContent>
    </div>
  );
}

export default Headers;
