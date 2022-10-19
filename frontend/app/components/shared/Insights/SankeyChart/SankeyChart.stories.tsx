import { storiesOf } from '@storybook/react';
import SankeyChart from './SankeyChart';

const data = {
  nodes: [
    { name: 'Home Page' },
    { name: 'Dashboard' },
    { name: 'Preferences' },
    { name: 'Billing' },
  
  ],
  links: [
    { source: 0, target: 1, value: 100 },
    { source: 1, target: 2, value: 50 },
    { source: 1, target: 3, value: 50 },
    { source: 2, target: 3, value: 10 },
  ],
};

storiesOf('SankeyChart', module).add('Pure', () => <SankeyChart data={data} />);
