import React from 'react';
import ByBrowser from '../SessionsBy/ByBrowser';
import BySystem from '../SessionsBy/BySystem';
import ByCountry from '../SessionsBy/ByCountry';
import ByUrl from '../SessionsBy/ByUrl';

interface ExampleProps {
  onCard: (card: string) => void;
}

const WebAnalytics: React.FC<ExampleProps> = ({ onCard }) => (
  <>
    <ByBrowser onCard={onCard} />
    <BySystem onCard={onCard} />
    <ByCountry onCard={onCard} />
    <ByUrl onCard={onCard} />
  </>
);

export default WebAnalytics;
