import React from 'react';
import { List } from 'immutable';
import { percentOf } from 'App/utils';
import { NoContent } from 'UI';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import SectionWrapper from './SectionWrapper';
import Barwrapper from './Barwrapper';
import Bar from './Bar';
import { useTranslation } from 'react-i18next';

function ResultTimings({ duration, timing }) {
  const { t } = useTranslation();
  const { blocked, connect, dns, queued, receive, send, ssl, wait } = timing;
  const _dns = Math.max(dns, 0);
  const _ssl = Math.max(ssl, 0);
  const _connect = Math.max(connect, 0);
  const _blocked = Math.max(blocked, 0);
  const total = parseInt(
    _blocked + _connect + _dns + queued + receive + send + wait,
  );

  const blockedStart = queued;
  const dnsStart = blockedStart + blocked;
  const connectStart = dnsStart + _dns;
  const sslStart = connectStart + _connect - _ssl;
  const sendStart = connectStart + _connect;
  const waitSrart = sendStart + send;
  const receiveStart = waitSrart + wait;
  return (
    <NoContent
      title={
        <div className="flex flex-col items-center justify-center">
          <AnimatedSVG name={ICONS.NO_RESULTS} size="60" />
          <div className="mt-6 text-2xl">{t('No Data!')}</div>
        </div>
      }
      // animatedIcon="no-results"
      show={List.isList(timing)}
      size="small"
    >
      <div className="bg-white flex flex-col rounded m-3">
        <SectionWrapper title={t('Resource Scheduling')}>
          <Barwrapper title={t('Queuing')} duration={queued}>
            <Bar
              start={percentOf(0, total)}
              end={percentOf(total - queued, total)}
            />
          </Barwrapper>
        </SectionWrapper>
        <SectionWrapper title={t('Connection Start')}>
          <Barwrapper title={t('Stalled')} duration={blocked}>
            <Bar
              start={percentOf(blockedStart, total)}
              end={percentOf(total - (queued + blocked), total)}
            />
          </Barwrapper>
          {dns >= 0 && (
            <Barwrapper title={t('DNS Lookup')} duration={_dns}>
              <Bar
                start={percentOf(dnsStart, total)}
                end={percentOf(total - (dnsStart + _dns), total)}
                color="green"
              />
            </Barwrapper>
          )}
          {connect >= 0 && (
            <Barwrapper title={t('Initial Connection')} duration={_connect}>
              <Bar
                start={percentOf(connectStart, total)}
                end={percentOf(total - (connectStart + _connect), total)}
                color="orange"
              />
            </Barwrapper>
          )}
          {ssl >= 0 && (
            <Barwrapper title="SSL" duration={_ssl}>
              <Bar
                start={percentOf(sslStart, total)}
                end={percentOf(total - (sslStart + _ssl), total)}
                color="violet"
              />
            </Barwrapper>
          )}
        </SectionWrapper>

        <SectionWrapper title={t('Request/Response')}>
          <Barwrapper title={t('Request Sent')} duration={send}>
            <Bar
              start={percentOf(sendStart, total)}
              end={percentOf(total - (sendStart + send), total)}
            />
          </Barwrapper>
          <Barwrapper title={t('Waiting (TTFB)')} duration={wait}>
            <Bar
              start={percentOf(waitSrart, total)}
              end={percentOf(total - (waitSrart + wait), total)}
              color="#00C852"
            />
          </Barwrapper>
          <Barwrapper title={t('Download')} duration={receive}>
            <Bar
              start={percentOf(receiveStart, total)}
              end={percentOf(total - (receiveStart + receive), total)}
              color="#01A8F4"
            />
          </Barwrapper>
        </SectionWrapper>
        <div className="flex my-3">
          <div className="font-medium">{t('Total')}</div>
          <div className="font-medium ml-auto">
            {total}&nbsp;{t('ms')}
          </div>
        </div>
      </div>
    </NoContent>
  );
}

export default ResultTimings;
