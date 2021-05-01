import { storiesOf } from '@storybook/react';
import ResultTimings from './ResultTimings';

const timing = [
  { "name": "connectStart", "value": 1602181968963 },
  { "name": "navigationStart", "value": 1602181965923 },
  { "name": "loadEventEnd", "value": 1602181993795 },
  { "name": "domLoading", "value": 1602181971233 },
  { "name": "secureConnectionStart", "value": 1602181969010 },
  { "name": "fetchStart", "value": 1602181965976 },
  { "name": "domContentLoadedEventStart", "value": 1602181980930 },
  { "name": "responseStart", "value": 1602181970432 },
  { "name": "responseEnd", "value": 1602181970763 },
  { "name": "domInteractive", "value": 1602181980930 },
  { "name": "domainLookupEnd", "value": 1602181968963 },
  { "name": "redirectStart", "value": 0 },
  { "name": "requestStart", "value": 1602181969932 },
  { "name": "unloadEventEnd", "value": 0 },
  { "name": "unloadEventStart", "value": 0 },
  { "name": "domComplete", "value": 1602181993794 },
  { "name": "domainLookupStart", "value": 1602181968871 },
  { "name": "loadEventStart", "value": 1602181993794 },
  { "name": "domContentLoadedEventEnd", "value": 1602181982868 },
  { "name": "redirectEnd", "value": 0 },
  { "name": "connectEnd", "value": 1602181969783 }
];

storiesOf('Shared', module)
  .add('ResultTimings', () => (
    <ResultTimings timing={timing} />
  ))

