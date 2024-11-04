import FeatureFlag, { Conditions, Variant } from '../app/mstore/types/FeatureFlag';
import { jest, test, expect, describe } from '@jest/globals';


jest.mock('App/mstore/types/filter', () => {
  let filterData = { filters: [] }

  class MockFilter {
    ID_KEY =  "filterId"
    filterId = ''
    name = ''
    filters = []
    eventsOrder = 'then'
    eventsOrderSupport = ['then', 'or', 'and']
    startTimestamp = 0
    endTimestamp = 0
    fromJson(json) {
      this.name = json.name
      this.filters = json.filters.map((i) => i)
      this.eventsOrder = json.eventsOrder
      return this
    }
  }
    return MockFilter
})

describe('Feature flag type test', () => {
  // Test cases for Conditions class
  test('Conditions class methods work correctly', () => {
    const conditions = new Conditions();

    conditions.setRollout(50);
    expect(conditions.rolloutPercentage).toBe(50);

    const jsObject = conditions.toJS();
    expect(jsObject.rolloutPercentage).toBe(50);
  });

  // Test cases for Variant class
  test('Variant class methods work correctly', () => {
    const variant = new Variant(1);

    variant.setIndex(2);
    expect(variant.index).toBe(2);

    variant.setKey('key');
    expect(variant.value).toBe('key');

    variant.setDescription('description');
    expect(variant.description).toBe('description');

    variant.setPayload('payload');
    expect(variant.payload).toBe('payload');

    variant.setRollout(90);
    expect(variant.rolloutPercentage).toBe(90);
  });

  // Test cases for FeatureFlag class
  test('FeatureFlag class methods work correctly', () => {
    const featureFlag = new FeatureFlag();

    featureFlag.setPayload('payload');
    expect(featureFlag.payload).toBe('payload');

    featureFlag.addVariant();
    expect(featureFlag.variants.length).toBe(3);

    featureFlag.removeVariant(1);
    expect(featureFlag.variants.length).toBe(2);

    featureFlag.redistributeVariants();
    expect(featureFlag.variants[0].rolloutPercentage).toBe(50);

    featureFlag.addCondition();
    expect(featureFlag.conditions.length).toBe(2);

    featureFlag.removeCondition(1);
    expect(featureFlag.conditions.length).toBe(1);

    featureFlag.setFlagKey('flagKey');
    expect(featureFlag.flagKey).toBe('flagKey');

    featureFlag.setDescription('description');
    expect(featureFlag.description).toBe('description');

    featureFlag.setIsPersist(true);
    expect(featureFlag.isPersist).toBe(true);

    featureFlag.setIsSingleOption(true);
    expect(featureFlag.isSingleOption).toBe(true);

    featureFlag.setIsEnabled(true);
    expect(featureFlag.isActive).toBe(true);
  });
});
