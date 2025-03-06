import React from 'react';

import FunnelWidget from 'Components/Funnels/FunnelWidget/FunnelWidget';
import Funnel from 'App/mstore/types/funnel';
import ExCard from './ExCard';

interface Props {
  title: string;
  type: string;
  onCard: (card: string) => void;
  data?: any;
}

function ExampleFunnel(props: Props) {
  const _data = {
    funnel: new Funnel().fromJSON(props.data),
  };
  return (
    <ExCard {...props}>
      <FunnelWidget data={_data} isWidget />
    </ExCard>
  );
}

export default ExampleFunnel;
