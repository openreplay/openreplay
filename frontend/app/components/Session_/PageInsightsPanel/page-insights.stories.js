import { storiesOf } from '@storybook/react';
import { List } from 'immutable';
import PageInsightsPanel from './';

const list = [
  {
    "alertId": 2,
    "projectId": 1,
    "name": "new alert",
    "description": null,
    "active": true,
    "threshold": 240,
    "detectionMethod": "threshold",
    "query": {
        "left": "avgPageLoad",
        "right": 1.0,
        "operator": ">="
    },
    "createdAt": 1591893324078,
    "options": {
        "message": [
            {
                "type": "slack",
                "value": "51"
            },
        ],
        "LastNotification": 1592929583000,
        "renotifyInterval": 120
    }
  },
  {
      "alertId": 14,
      "projectId": 1,
      "name": "alert 19.06",
      "description": null,
      "active": true,
      "threshold": 30,
      "detectionMethod": "threshold",
      "query": {
          "left": "avgPageLoad",
          "right": 3000.0,
          "operator": ">="
      },
      "createdAt": 1592579750935,
      "options": {
          "message": [
              {
                  "type": "slack",
                  "value": "51"
              }
          ],
          "renotifyInterval": 120
      }
  },
  {
      "alertId": 15,
      "projectId": 1,
      "name": "notify every 60min",
      "description": null,
      "active": true,
      "threshold": 30,
      "detectionMethod": "threshold",
      "query": {
          "left": "avgPageLoad",
          "right": 1.0,
          "operator": ">="
      },
      "createdAt": 1592848779604,
      "options": {
          "message": [
              {
                  "type": "slack",
                  "value": "51"
              },
          ],
          "LastNotification": 1599135058000,
          "renotifyInterval": 60
      }
  },
  {
      "alertId": 21,
      "projectId": 1,
      "name": "always notify",
      "description": null,
      "active": true,
      "threshold": 30,
      "detectionMethod": "threshold",
      "query": {
          "left": "avgPageLoad",
          "right": 1.0,
          "operator": ">="
      },
      "createdAt": 1592849011350,
      "options": {
          "message": [
              {
                  "type": "slack",
                  "value": "51"
              }
          ],
          "LastNotification": 1599135058000,
          "renotifyInterval": 10
      }
  }
]

const notifications = List([
    { title: 'test', type: 'change', createdAt: 1591893324078, description: 'Lorem ipusm'},
    { title: 'test', type: 'threshold', createdAt: 1591893324078, description: 'Lorem ipusm'},
    { title: 'test', type: 'threshold', createdAt: 1591893324078, description: 'Lorem ipusm'},
    { title: 'test', type: 'threshold', createdAt: 1591893324078, description: 'Lorem ipusm'},
])
storiesOf('PageInsights', module)
  .add('Panel', () => (
    <PageInsightsPanel />
  ))  
