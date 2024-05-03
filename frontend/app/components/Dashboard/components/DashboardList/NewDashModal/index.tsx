import { Segmented } from 'antd';
import { Activity, BarChart, TableCellsMerge, TrendingUp } from 'lucide-react';
import React from 'react';

import { Modal } from 'UI';

import ExampleCount from './Examples/Count';
import ExampleFunnel from './Examples/Funnel';
import ExamplePath from './Examples/Path';
import PerfBreakdown from './Examples/PerfBreakdown';
import ByBrowser from './Examples/SessionsBy/ByBrowser';
import ByCountry from './Examples/SessionsBy/ByCountry';
import BySystem from './Examples/SessionsBy/BySystem';
import ByUrl from './Examples/SessionsBy/ByUrl';
import SessionsByErrors from './Examples/SessionsByErrors';
import SessionsByIssues from './Examples/SessionsByIssues';
import SlowestDomain from './Examples/SlowestDomain';
import ExampleTrend from './Examples/Trend';

function NewDashboardModal(props: { onClose: () => void; open: boolean }) {
  const [step, setStep] = React.useState(0);

  const onCard = (card: string) => {
    console.log(card);
  };
  return (
    <Modal onClose={props.onClose} open={props.open} size={'xlarge'}>
      <Modal.Content className={'bg-[#FAFAFA]'}>
        <div className={'flex flex-col gap-4'}>
          {step === 0 ? (
            <SelectCard onClose={props.onClose} onCard={onCard} />
          ) : null}
        </div>
      </Modal.Content>
    </Modal>
  );
}

function SelectCard({
  onClose,
  onCard,
}: {
  onClose: () => void;
  onCard: (card: string) => void;
}) {
  const initial = 'product-analytics';
  const [selected, setSelected] = React.useState(initial);
  let item;
  switch (selected) {
    case 'product-analytics':
      item = <ProductAnalytics onCard={onCard} />;
      break;
    case 'performance-monitoring':
      item = <PerformanceMonitoring onCard={onCard} />;
      break;
    case 'web-analytics':
      item = <WebAnalytics onCard={onCard} />;
      break;
    case 'core-web-vitals':
      item = <CoreWebVitals onCard={onCard} />;
      break;
    default:
      item = <div>under construction</div>;
      break;
  }
  return (
    <>
      <div className={'flex items-center justify-between'}>
        <div className={'text-2xl leading-4 font-semibold'}>
          Select your first card type to add to the dashboard
        </div>
        <div className={'link'} onClick={onClose}>
          Close
        </div>
      </div>
      <div>
        <Segmented
          options={[
            {
              label: (
                <div className={'flex items-center gap-2'}>
                  <TrendingUp size={16} strokeWidth={1} />
                  <div>Product Analytics</div>
                </div>
              ),
              value: 'product-analytics',
            },
            {
              label: (
                <div className={'flex items-center gap-2'}>
                  <Activity size={16} strokeWidth={1} />
                  <div>Performance Monitoring</div>
                </div>
              ),
              value: 'performance-monitoring',
            },
            {
              label: (
                <div className={'flex items-center gap-2'}>
                  <BarChart size={16} strokeWidth={1} />
                  <div>Web Analytics</div>
                </div>
              ),
              value: 'web-analytics',
            },
            {
              label: (
                <div className={'flex items-center gap-2'}>
                  <TableCellsMerge size={16} strokeWidth={1} />
                  <div>Core Web Vitals</div>
                </div>
              ),
              value: 'core-web-vitals',
            },
          ]}
          onChange={(v) => setSelected(v)}
        />

        <div
          style={{ maxHeight: 'calc(100vh - 210px)' }}
          className={'mt-2 w-full flex flex-wrap gap-2 overflow-scroll'}
        >
          {item}
        </div>
      </div>
    </>
  );
}

function ProductAnalytics({ onCard }: { onCard: (card: string) => void }) {
  return (
    <>
      <ExampleFunnel onCard={onCard} />
      <ExamplePath onCard={onCard} />
      <ExampleTrend onCard={onCard} />
      <ExampleCount onCard={onCard} />
    </>
  );
}

function PerformanceMonitoring({ onCard }: { onCard: (card: string) => void }) {
  return (
    <>
      <PerfBreakdown onCard={onCard} />
      <SlowestDomain onCard={onCard} />
      <SessionsByErrors onCard={onCard} />
      <SessionsByIssues onCard={onCard} />
    </>
  );
}

function WebAnalytics({ onCard }: { onCard: (card: string) => void }) {
  return (
    <>
      <ByBrowser onCard={onCard} />
      <BySystem onCard={onCard} />
      <ByCountry onCard={onCard} />
      <ByUrl onCard={onCard} />
    </>
  );
}

function CoreWebVitals({ onCard }: { onCard: (card: string) => void }) {
  return (
    <>
      <PerfBreakdown onCard={onCard} />
      <SlowestDomain onCard={onCard} />
      <SessionsByIssues onCard={onCard} />
      <SessionsByErrors onCard={onCard} />
    </>
  );
}

export default NewDashboardModal;
