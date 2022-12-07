import SankeyChart, { SankeyChartData } from './SankeyChart';
import React from 'react';
import { ComponentMeta, ComponentStory } from '@storybook/react';

const data: SankeyChartData = {
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

export default {
  title: 'Dashboad/Cards/SankeyChart',
  component: SankeyChart,
} as ComponentMeta<typeof SankeyChart>;

const Template: ComponentStory<typeof SankeyChart> = (args: any) => <SankeyChart {...args} />;

export const Simple = Template.bind({});
Simple.args = { data };
