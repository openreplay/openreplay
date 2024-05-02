import { Segmented } from 'antd';
import { Activity, BarChart, TableCellsMerge, TrendingUp } from 'lucide-react';
import React from 'react';

import { Modal } from 'UI';
import ExampleCount from "./Examples/Count";

import ExampleFunnel from './Examples/Funnel';
import ExamplePath from './Examples/Path';
import PerfBreakdown from "./Examples/PerfBreakdown";
import SessionsByErrors from "./Examples/SessionsByErrors";
import SessionsByIssues from "./Examples/SessionsByIssues";
import SlowestDomain from "./Examples/SlowestDomain";
import ExampleTrend from './Examples/Trend';

function NewDashboardModal(props: { onClose: () => void; open: boolean }) {
  const initial = 'performance-monitoring' //'product-analytics';
  const [selected, setSelected] = React.useState(initial);
  let item;
  switch (selected) {
    case 'product-analytics':
      item = <ProductAnalytics />
      break;
    case 'performance-monitoring':
      item = <PerformanceMonitoring />
      break;
    default:
      item = <div>under construction</div>
      break;
  }
  return (
    <Modal onClose={props.onClose} open={props.open} size={'xlarge'}>
      <Modal.Content className={'bg-[#FAFAFA]'}>
        <div className={'flex flex-col gap-4'}>
          <div className={'flex items-center justify-between'}>
            <div className={'text-2xl leading-4 font-semibold'}>
              Select your first card type to add to the dashboard
            </div>
            <div className={'link'} onClick={props.onClose}>
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

            <div style={{ maxHeight: 'calc(100vh - 210px)'}} className={'mt-2 w-full flex flex-wrap gap-2 overflow-scroll'}>
              {item}
            </div>
          </div>
        </div>
      </Modal.Content>
    </Modal>
  );
}

function ProductAnalytics() {
  return (
    <>
      <ExampleFunnel />
      <ExamplePath />
      <ExampleTrend />
      <ExampleCount />
    </>
  )
}

function PerformanceMonitoring() {
  return (
    <>
      <PerfBreakdown />
      <SlowestDomain />
      <SessionsByErrors />
      <SessionsByIssues />
    </>
  )
}

export default NewDashboardModal;
