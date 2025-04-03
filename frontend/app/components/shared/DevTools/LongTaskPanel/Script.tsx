import React from 'react'
import { LongAnimationTask } from './type'

function getAddress(script: LongAnimationTask['scripts'][number]) {
  return `${script.sourceURL}${script.sourceFunctionName ? ':' + script.sourceFunctionName : ''}${script.sourceCharPosition && script.sourceCharPosition >= 0 ? ':' + script.sourceCharPosition : ''}`;
}
function ScriptTitle({
  script,
}: {
  script: LongAnimationTask['scripts'][number]
}) {
  return script.invokerType ? (
    <span>{script.invokerType}</span>
  ) : (
           <span>{script.name}</span>
         )
}

function ScriptInfo({
  script,
}: {
  script: LongAnimationTask['scripts'][number];
}) {
  const hasInvoker = script.invoker !== script.sourceURL;
  return (
    <div className={'border-l border-l-gray-light pl-1'}>
      {hasInvoker ? (
        <InfoEntry title={'invoker:'} value={script.invoker} />
      ) : null}
      <InfoEntry title={'address:'} value={getAddress(script)} />
      <InfoEntry title={'script execution:'} value={`${script.duration} ms`} />
      <InfoEntry title={'pause duration:'} value={`${script.pauseDuration} ms`} />
    </div>
  );
}

function InfoEntry({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className={'flex items-center gap-1'}>
      <div className={'text-disabled-text'}>{title}</div>
      <div>{value}</div>
    </div>
  );
}

function Script({ script }: { script: LongAnimationTask['scripts'][number] }) {
  return (
    <div className="flex flex-col">
      <ScriptTitle script={script} />
      <ScriptInfo script={script} />
    </div>
  )
}

export default Script