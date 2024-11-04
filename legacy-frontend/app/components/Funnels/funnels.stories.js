import { storiesOf } from '@storybook/react';
import Funnel from 'Types/funnel'
import FunnelIssue from 'Types/funnelIssue'
import FunnelList from './FunnelList';
import FunnelItem from './FunnelItem';
import IssueItem from './IssueItem';
import FunnelGraph from './FunnelGraph';
import FunnelHeader from './FunnelHeader';
import FunnelOverview from './FunnelOverview';
import IssueFilter from './IssueFilter';

const funnel = Funnel({
  title: 'Sessions from france',
  users: 308,
  steps: 10,
  sessionsCount: 200,
  criticalIssues: 5,
  missedConversions: 30
})

const list = [funnel, funnel, funnel];

const funnelIssue = FunnelIssue({
  type: 'Error',
  error: 'Unchecked runtime lasterror the message port closed before a response was received.',
  affectedUsers: 132,
  conversionImpact: 30,
  lostConversions: 200,
})

storiesOf('Funnels', module)
  .add('Funnel List', () => (
    <FunnelList list={list} />
  ))
  .add('Funnel Item', () => (
    <FunnelItem funnel={funnel} />
  ))
  .add('Funnel Header', () => (
    <FunnelHeader />
  ))
  .add('Funnel Header', () => (
    <FunnelHeader funnel={funnel} />
  ))
  .add('Issue Item', () => (
    <IssueItem issue={funnelIssue} />
  ))
  .add('Funnel graph', () => (
    <FunnelGraph />
  ))
  .add('Funnel Overview', () => (
    <FunnelOverview funnel={funnel} />
  ))
  .add('Funnel IssueFilter', () => (
    <IssueFilter />
  ))
