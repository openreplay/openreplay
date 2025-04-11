import React from 'react';
import PerfBreakdown from '../PerfBreakdown';
import SlowestDomain from '../SlowestDomain';
import SessionsByIssues from '../SessionsByIssues';
import SessionsByErrors from '../SessionsByErrors';

interface ExampleProps {
  onCard: (card: string) => void;
}

const CoreWebVitals: React.FC<ExampleProps> = ({ onCard }) => (
  <>
    <PerfBreakdown onCard={onCard} />
    <SlowestDomain onCard={onCard} />
    <SessionsByIssues onCard={onCard} />
    <SessionsByErrors onCard={onCard} />
  </>
);

export default CoreWebVitals;
