import React from 'react';
import { QuestionMarkHint } from 'UI';

function Rollout() {
    return (
        <div className={'flex items-center gap-2'}>
            Rollout <QuestionMarkHint content={"Must add up to 100% across all variants"} />
        </div>
    );
}

function Payload() {
  return (
    <div className={'flex items-center gap-2'}>
      Payload <QuestionMarkHint content={"will be sent as a string"} />
    </div>
  )
}

export { Payload, Rollout };