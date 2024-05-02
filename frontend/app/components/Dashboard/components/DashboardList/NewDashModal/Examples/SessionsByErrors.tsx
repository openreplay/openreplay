import React from 'react'
import ExCard from "./ExCard";
import { Errors } from "./Count";

function SessionsByErrors() {
  return (
    <ExCard
      title={'Sessions by Errors'}
    >
      <Errors />
    </ExCard>
  );
}

export default SessionsByErrors