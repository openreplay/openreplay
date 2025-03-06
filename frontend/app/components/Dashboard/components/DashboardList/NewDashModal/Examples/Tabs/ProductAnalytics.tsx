import React from 'react';
import ExampleFunnel from '../Funnel';
import ExamplePath from '../Path';
import ExampleTrend from '../Trend';
import ExampleCount from '../Count';

interface ExampleProps {
  onCard: (card: string) => void;
}

const ProductAnalytics: React.FC<ExampleProps> = ({ onCard }) => (
  <>
    <ExampleFunnel onCard={onCard} />
    <ExamplePath onCard={onCard} />
    <ExampleTrend onCard={onCard} />
    <ExampleCount onCard={onCard} />
  </>
);

export default ProductAnalytics;
