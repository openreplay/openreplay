import React from 'react'
import ExCard from "./ExCard";
import { Frustrations } from "./Count";

function SessionsByIssues() {
  return (
    <ExCard
      title={'Sessions by Issues'}
    >
      <Frustrations />
    </ExCard>
  );
}

export default SessionsByIssues