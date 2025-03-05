import React from 'react';
import ExCard from './ExCard';
import { Errors } from './Count';

function SessionsByErrors(props: any) {
  return (
    <ExCard {...props}>
      <Errors />
    </ExCard>
  );
}

export default SessionsByErrors;
