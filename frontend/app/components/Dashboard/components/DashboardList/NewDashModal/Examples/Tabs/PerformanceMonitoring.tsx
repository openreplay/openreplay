import React from 'react';
import PerfBreakdown from '../PerfBreakdown';
import SlowestDomain from '../SlowestDomain';
import SessionsByErrors from '../SessionsByErrors';
import SessionsByIssues from '../SessionsByIssues';

interface ExampleProps {
  onCard: (card: string) => void;
}

const PerformanceMonitoring: React.FC<ExampleProps> = ({ onCard }) => (
  <>
    <PerfBreakdown onCard={onCard} />
    <SlowestDomain onCard={onCard} />
    <SessionsByErrors onCard={onCard} />
    <SessionsByIssues onCard={onCard} />
  </>
);

export default PerformanceMonitoring;
