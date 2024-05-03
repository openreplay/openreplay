import React from 'react'
import ExCard from "./ExCard";
import { Errors } from "./Count";

function SessionsByErrors({ onCard }: { onCard: (card: string) => void }) {
  return (
    <ExCard
      onCard={onCard}
      type={'sessions-by-errors'}
      title={'Sessions by Errors'}
    >
      <Errors />
    </ExCard>
  );
}

export default SessionsByErrors