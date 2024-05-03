import React from 'react'
import ExCard from "./ExCard";
import { Frustrations } from "./Count";

function SessionsByIssues({ onCard }: { onCard: (card: string) => void }) {
  return (
    <ExCard
      onCard={onCard}
      type={'sessions-by-issues'}
      title={'Sessions by Issues'}
    >
      <Frustrations />
    </ExCard>
  );
}

export default SessionsByIssues