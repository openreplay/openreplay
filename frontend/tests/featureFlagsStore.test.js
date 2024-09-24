import { describe, expect, jest, test } from '@jest/globals';

import FeatureFlagsStore from 'App/mstore/FeatureFlagsStore';
import FeatureFlag from 'App/mstore/types/FeatureFlag';

const mockFlags = [{ featureFlagId: 1 }, { featureFlagId: 2 }];
const mockFlag = { featureFlagId: 3 };
const mockFlagId = mockFlag.featureFlagId;
jest.mock('App/services', () => {
  return {
    fflagsService: {
      fetchFlags: () => Promise.resolve({ list: mockFlags, total: mockFlags.length }),
      createFlag: () => Promise.resolve(mockFlag),
      updateFlag: () => Promise.resolve(mockFlag),
      deleteFlag: () => Promise.resolve(mockFlagId),
      getFlag: () => Promise.resolve(mockFlag),
    },
  };
});

jest.mock('App/mstore/types/FeatureFlag', () => {
  class FakeClass {
    constructor(data) {
      Object.assign(this, data);
    }
    setHasChanged() {
      return jest.fn(() => this);
    }

    toJS() {
      return jest.fn(() => this);
    }
  }
  return FakeClass;
});

describe('FeatureFlagsStore', () => {
  test('should fetch flags', async () => {
    const store = new FeatureFlagsStore();

    await store.fetchFlags();

    expect(store.flags.length).toBe(mockFlags.length);
    expect(store.flags[0].featureFlagId).toBe(mockFlags[0].featureFlagId);
    expect(store.flags[1].featureFlagId).toBe(mockFlags[1].featureFlagId);
  });

  test('should create a flag', async () => {
    const store = new FeatureFlagsStore();
    store.setCurrentFlag(new FeatureFlag());

    await store.createFlag();

    expect(store.flags.length).toBe(1);
    expect(store.flags[0].featureFlagId).toBe(mockFlag.featureFlagId);
  });

  test('should update a flag', async () => {
    const store = new FeatureFlagsStore();
    store.currentFflag = new FeatureFlag();

    await store.updateFlag();

    expect(store.currentFflag.featureFlagId).toBe(mockFlag.featureFlagId);
  });

  test('should delete a flag', async () => {
    const store = new FeatureFlagsStore();
    store.flags = [new FeatureFlag({ featureFlagId: mockFlagId })];

    await store.deleteFlag(mockFlagId);

    expect(store.flags.length).toBe(0);
  });

  test('should fetch a flag', async () => {
    const store = new FeatureFlagsStore();

    await store.fetchFlag(mockFlag.featureFlagId);

    expect(store.currentFflag.featureFlagId).toBe(mockFlag.featureFlagId);
  });
});
