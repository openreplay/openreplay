import React from 'react';

import ExCard from './ExCard';
import FunnelWidget from 'Components/Funnels/FunnelWidget/FunnelWidget';
import Funnel from 'App/mstore/types/funnel';

interface Props {
  title: string;
  type: string;
  onCard: (card: string) => void;
  data?: any,
}

function ExampleFunnel(props: Props) {
  const _data = {
    funnel: new Funnel().fromJSON(props.data)
  };
  return (
    <ExCard
      {...props}
    >
      <FunnelWidget data={_data} isWidget={true} />
    </ExCard>
  );
}

export default ExampleFunnel;
