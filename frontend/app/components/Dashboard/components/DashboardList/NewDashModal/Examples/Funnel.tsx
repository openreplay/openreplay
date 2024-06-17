import { ArrowRight } from 'lucide-react';
import React from 'react';

import ExCard from './ExCard';
import {FUNNEL} from "App/constants/card";

function ExampleFunnel(props: any) {
  const steps = [
    {
      progress: 500,
    },
    {
      progress: 250,
    },
    {
      progress: 100,
    },
  ];
  return (
    <ExCard
      {...props}
    >
      <>
        {steps.map((step, index) => (
          <div key={index}>
            <div>Step {index + 1}</div>
            <div className={'rounded flex items-center w-full overflow-hidden'}>
              <div
                style={{
                  backgroundColor: step.progress <= 100 ? '#394EFF' : '#E2E4F6',
                  width: `${(step.progress / 500) * 100}%`,
                  height: 30,
                }}
              />
              <div
                style={{
                  width: `${((500 - step.progress) / 500) * 100}%`,
                  height: 30,
                  background: '#FFF1F0',
                }}
              />
            </div>
            <div className={'flex items-center gap-2'}>
              <ArrowRight size={14} color={'#8C8C8C'} strokeWidth={1} />
              <div className={'text-disabled-text'}>{step.progress}</div>
            </div>
          </div>
        ))}
      </>
    </ExCard>
  );
}

export default ExampleFunnel;
