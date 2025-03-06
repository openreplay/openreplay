import React from 'react';
import ExCard from 'Components/Dashboard/components/DashboardList/NewDashModal/Examples/ExCard';
import InsightsCard from 'Components/Dashboard/Widgets/CustomMetricsWidgets/InsightsCard';
import { InsightIssue } from 'App/mstore/types/widget';
import SessionsPerBrowser from 'Components/Dashboard/Widgets/PredefinedWidgets/SessionsPerBrowser';
import SpeedIndexByLocation from 'Components/Dashboard/Widgets/PredefinedWidgets/SpeedIndexByLocation';

interface Props {
  title: string;
  type: string;
  onCard: (card: string) => void;
}

function SpeedIndexByLocationExample(props: Props) {
  const data = {
    value: 1480,
    chart: [
      {
        userCountry: 'AT',
        value: 415,
      },
      {
        userCountry: 'PL',
        value: 433.1666666666667,
      },
      {
        userCountry: 'FR',
        value: 502,
      },
      {
        userCountry: 'IT',
        value: 540.4117647058823,
      },
      {
        userCountry: 'TH',
        value: 662.0,
      },
      {
        userCountry: 'ES',
        value: 740.5454545454545,
      },
      {
        userCountry: 'SG',
        value: 889.6666666666666,
      },
      {
        userCountry: 'TW',
        value: 1008.0,
      },
      {
        userCountry: 'HU',
        value: 1027.0,
      },
      {
        userCountry: 'DE',
        value: 1054.4583333333333,
      },
      {
        userCountry: 'BE',
        value: 1126.0,
      },
      {
        userCountry: 'TR',
        value: 1174.0,
      },
      {
        userCountry: 'US',
        value: 1273.3015873015872,
      },
      {
        userCountry: 'GB',
        value: 1353.8095238095239,
      },
      {
        userCountry: 'VN',
        value: 1473.8181818181818,
      },
      {
        userCountry: 'HK',
        value: 1654.6666666666667,
      },
    ],
    unit: 'ms',
  };
  return (
    <ExCard {...props}>
      <SpeedIndexByLocation data={data} />
    </ExCard>
  );
}

export default SpeedIndexByLocationExample;
