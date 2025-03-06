import React from 'react';
import ExCard from 'Components/Dashboard/components/DashboardList/NewDashModal/Examples/ExCard';
import { Errors } from 'Components/Dashboard/components/DashboardList/NewDashModal/Examples/Count';
import CustomMetricTableErrors from 'Components/Dashboard/Widgets/CustomMetricsWidgets/CustomMetricTableErrors';

function TableOfErrors(props: any) {
  const data = {
    total: 53,
    errors: [
      {
        errorId: '915785df4535216f2911bbb21a1afc9658c',
        name: 'TypeError',
        message: 'e.update is not a function',
        users: 14,
        sessions: 15,
        lastOccurrence: 1725014275603,
        firstOccurrence: 1722623575416,
        chart: [
          {
            count: 1,
            timestamp: 1724371200000,
          },
          {
            count: 0,
            timestamp: 1724486399833,
          },
          {
            count: 0,
            timestamp: 1724601599666,
          },
          {
            count: 6,
            timestamp: 1724716799499,
          },
          {
            count: 3,
            timestamp: 1724831999332,
          },
          {
            count: 5,
            timestamp: 1724947199165,
          },
          {
            count: 0,
            timestamp: 1725062398998,
          },
        ],
        viewed: false,
      },
      {
        errorId: '915d0c598f4e14456af9ab9f4b992329729',
        name: 'Unhandled Promise Rejection',
        message: '"Timeout (b)"',
        users: 2,
        sessions: 2,
        lastOccurrence: 1725013879988,
        firstOccurrence: 1718110576163,
        chart: [
          {
            count: 0,
            timestamp: 1724371200000,
          },
          {
            count: 0,
            timestamp: 1724486399833,
          },
          {
            count: 0,
            timestamp: 1724601599666,
          },
          {
            count: 0,
            timestamp: 1724716799499,
          },
          {
            count: 1,
            timestamp: 1724831999332,
          },
          {
            count: 1,
            timestamp: 1724947199165,
          },
          {
            count: 0,
            timestamp: 1725062398998,
          },
        ],
        viewed: false,
      },
      {
        errorId: '915c22f1195ec3067dbd0a75638a2d64f0b',
        name: 'Unhandled Promise Rejection',
        message: '{"message":"! GET error on /cards; 403","response":{}}',
        users: 2,
        sessions: 2,
        lastOccurrence: 1725013720866,
        firstOccurrence: 1709287604526,
        chart: [
          {
            count: 1,
            timestamp: 1724371200000,
          },
          {
            count: 0,
            timestamp: 1724486399833,
          },
          {
            count: 0,
            timestamp: 1724601599666,
          },
          {
            count: 0,
            timestamp: 1724716799499,
          },
          {
            count: 0,
            timestamp: 1724831999332,
          },
          {
            count: 1,
            timestamp: 1724947199165,
          },
          {
            count: 0,
            timestamp: 1725062398998,
          },
        ],
        viewed: false,
      },
      {
        errorId: '915206415c1c4b79e8f5f55bba62544c3c5',
        name: 'Unhandled Promise Rejection',
        message: '{"message":"! GET error on /dashboards; 403","response":{}}',
        users: 1,
        sessions: 1,
        lastOccurrence: 1725013689204,
        firstOccurrence: 1715788328614,
        chart: [
          {
            count: 0,
            timestamp: 1724371200000,
          },
          {
            count: 0,
            timestamp: 1724486399833,
          },
          {
            count: 0,
            timestamp: 1724601599666,
          },
          {
            count: 0,
            timestamp: 1724716799499,
          },
          {
            count: 0,
            timestamp: 1724831999332,
          },
          {
            count: 1,
            timestamp: 1724947199165,
          },
          {
            count: 0,
            timestamp: 1725062398998,
          },
        ],
        viewed: false,
      },
      {
        errorId: '91514ac2304acfca5d82cd518fb36e5fc22',
        name: 'TypeError',
        message: "Cannot read properties of undefined (reading 'status')",
        users: 1,
        sessions: 1,
        lastOccurrence: 1725013072800,
        firstOccurrence: 1725013072800,
        chart: [
          {
            count: 0,
            timestamp: 1724371200000,
          },
          {
            count: 0,
            timestamp: 1724486399833,
          },
          {
            count: 0,
            timestamp: 1724601599666,
          },
          {
            count: 0,
            timestamp: 1724716799499,
          },
          {
            count: 0,
            timestamp: 1724831999332,
          },
          {
            count: 1,
            timestamp: 1724947199165,
          },
          {
            count: 0,
            timestamp: 1725062398998,
          },
        ],
        viewed: false,
      },
    ],
  };
  return (
    <ExCard {...props}>
      <CustomMetricTableErrors data={data} metric={{}} />
    </ExCard>
  );
}

export default TableOfErrors;
