import React from 'react';
import { QuestionMarkHint } from 'UI';

function Rollout() {
    return (
        <div className={'flex items-center gap-1'}>
            Rollout <QuestionMarkHint content={"Must add up to 100% across all variants"} />
        </div>
    );
}

export default Rollout;