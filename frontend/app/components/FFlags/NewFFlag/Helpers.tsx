import React from 'react';
import { QuestionMarkHint } from 'UI';

function Rollout() {
    return (
        <div className={'flex items-center gap-2'}>
            Rollout <QuestionMarkHint delay={150} content={"Must add up to 100% across all variants"} />
        </div>
    );
}

function Payload() {
  return (
    <div className={'flex items-center gap-2'}>
      Payload <QuestionMarkHint delay={150} content={"Will be sent as a string"} /> <span className={"text-disabled-text text-sm"}>(Optional)</span>
    </div>
  )
}

export { Payload, Rollout };