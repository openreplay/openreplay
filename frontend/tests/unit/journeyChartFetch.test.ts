import { describe, expect, it, jest } from '@jest/globals';

import { USER_PATH } from 'App/constants/card';
import Widget from 'App/mstore/types/widget';
import MetricService from 'App/services/MetricService';

function serviceWithSpy() {
  const post = jest.fn(async (_path: string, _body: any) => ({
    json: async () => ({ data: { nodes: [], links: [] } }),
  }));
  return { service: new MetricService({ post } as any), post };
}

const journey = (viewType: string) =>
  new Widget().fromJson({
    metricId: 7,
    metricType: USER_PATH,
    viewType,
    series: [],
    hideExcess: false,
    rows: 3,
  });

describe('journey card chart request', () => {
  it('a card saved as a sunburst asks /cards/try for the flow chart', async () => {
    const { service, post } = serviceWithSpy();
    const w = journey('sunburst');
    await service.getMetricChartData(w, { startTimestamp: 1 }, true);
    const [path, body] = post.mock.calls[0];
    expect(path).toBe('/PROJECT_ID/cards/try');
    expect(body).toMatchObject({
      metricType: USER_PATH,
      viewType: 'lineChart',
      hideExcess: true,
      rows: 5,
      startTimestamp: 1,
      density: 5,
    });
  });

  it('other saved journeys keep the saved endpoint and its body', async () => {
    const { service, post } = serviceWithSpy();
    await service.getMetricChartData(
      journey('lineChart'),
      { startTimestamp: 1 },
      true,
    );
    expect(post.mock.calls[0][0]).toBe('/PROJECT_ID/cards/7/chart');
    expect(post.mock.calls[0][1]).toEqual({
      startTimestamp: 1,
      density: 5,
      metricOf: 'sessionCount',
    });
  });
});
