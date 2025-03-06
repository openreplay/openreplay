import React from 'react';
import ExCard from './ExCard';
import { Frustrations } from './Count';

function SessionsByIssues(props: any) {
  return (
    <ExCard {...props}>
      <Frustrations />
    </ExCard>
  );
}

export default SessionsByIssues;
