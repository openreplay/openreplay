import React from 'react';
import { Story, Meta } from '@storybook/react';

import GettingStartedModal, { Props } from './GettingStartedModal';
import { Step } from './StepList';

const list: Step[] = [
  {
    title: '🕵️ Install OpenReplay',
    status: 'pending',
    description: 'Install OpenReplay on your website or mobile app.',
    icon: 'tools',
  },
  {
    title: '🕵️ Identify Users',
    status: 'pending',
    description: 'Identify users across devices and sessions.',
    icon: 'users',
  },
  {
    title: '🕵️ Integrations',
    status: 'completed',
    description: 'Identify users across devices and sessions.',
    icon: 'users',
  },
  {
    title: '🕵️ Invite Team Members',
    status: 'ignored',
    description: 'Identify users across devices and sessions.',
    icon: 'users',
  },
];

export default {
  title: 'GettingStarted',
  component: GettingStartedModal,
} as Meta;

const Template: Story<Props> = (args) => <GettingStartedModal {...args} />;

export const Default = Template.bind({});
Default.args = {
  list,
};
