import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import { makeAutoObservable } from "mobx";
import Filter from "App/mstore/types/filter";
import FeatureFlag, { Variant, Conditions } from "App/mstore/types/FeatureFlag";

jest.mock("mobx");
jest.mock("App/mstore/types/filter");

describe("Conditions", () => {
  let conditions;

  beforeEach(() => {
    makeAutoObservable.mockClear();
    Filter.mockClear();
    conditions = new Conditions();
    global.localStorage = jest.fn()
    Object.defineProperty(window, 'localStorage', { value: jest.fn() });
  });

  test("should initialize with default values", () => {
    expect(conditions.rolloutPercentage).toBe(100);
    expect(Filter).toHaveBeenCalledTimes(1);
    expect(conditions.filter.fromJson).toHaveBeenCalledWith({
      name: "Rollout conditions",
      filters: [],
    });
  });

  test("should initialize with provided data", () => {
    const data = {
      rolloutPercentage: 50,
      filter: {
        name: "Filter Name",
        filters: [{ field: "field1", value: "value1" }],
      },
    };
    conditions = new Conditions(data);

    expect(conditions.rolloutPercentage).toBe(data.rolloutPercentage);
    expect(Filter).toHaveBeenCalledTimes(1);
    expect(conditions.filter.fromJson).toHaveBeenCalledWith(data);
  });

  test("should set the rollout percentage", () => {
    const value = 75;
    conditions.setRollout(value);

    expect(conditions.rolloutPercentage).toBe(value);
  });

  test("should convert to plain JavaScript object", () => {
    const filters = [{ field: "field1", value: "value1" }];
    conditions.filter.filters = filters;

    const result = conditions.toJS();

    expect(result).toEqual({
      name: conditions.filter.name,
      rolloutPercentage: conditions.rolloutPercentage,
      filters: filters.map((f) => f.toJson()),
    });
  });
});

describe("FeatureFlag", () => {
  let featureFlag;
  let initDataMock;
  let variantMock;

  beforeEach(() => {
    Object.assign = jest.fn();
    makeAutoObservable.mockClear();
    initDataMock = {
      name: "New Feature Flag",
      flagKey: "",
      isActive: false,
      isPersist: false,
      isSingleOption: true,
      conditions: [],
      description: "",
      featureFlagId: 0,
      createdAt: 0,
      updatedAt: 0,
      createdBy: 0,
      updatedBy: 0,
    };
    variantMock = jest.fn();
    Variant.mockImplementation(variantMock);
    featureFlag = new FeatureFlag({});
  });

  test("should initialize with default values", () => {
    expect(Object.assign).toHaveBeenCalledWith(
      featureFlag,
      initDataMock,
      expect.any(Object)
    );
    expect(featureFlag.isSingleOption).toBe(true);
    expect(featureFlag.conditions.length).toBe(1);
    expect(variantMock).toHaveBeenCalledTimes(1);
    expect(variantMock.mock.calls[0][0]).toBe(1);
  });

  test("should initialize with provided data", () => {
    const data = {
      name: "Feature Flag",
      flagKey: "flag-key",
      isActive: true,
      isPersist: true,
      isSingleOption: false,
      conditions: [{ rolloutPercentage: 50 }],
      variants: [{ value: "variant1" }, { value: "variant2" }],
    };
    featureFlag = new FeatureFlag(data);

    expect(Object.assign).toHaveBeenCalledWith(
      featureFlag,
      initDataMock,
      {
        ...data,
        isSingleOption: data.flagType === "single" || true,
        conditions: expect.any(Array),
        variants: expect.any(Array),
      }
    );
    expect(featureFlag.isSingleOption).toBe(data.isSingleOption);
    expect(featureFlag.conditions.length).toBe(data.conditions.length);
    expect(featureFlag.variants.length).toBe(data.variants.length);
    expect(variantMock).toHaveBeenCalledTimes(data.variants.length);
  });

  test("should set the payload", () => {
    const payload = "payload";
    featureFlag.setPayload(payload);

    expect(featureFlag.payload).toBe(payload);
  });

  test("should add a variant", () => {
    const initialLength = featureFlag.variants.length;
    featureFlag.addVariant();

    expect(featureFlag.variants.length).toBe(initialLength + 1);
    expect(featureFlag.redistributeVariants).toHaveBeenCalled();
  });

  test("should remove a variant", () => {
    const index = 1;
    featureFlag.removeVariant(index);

    expect(featureFlag.variants.length).toBe(0);
    expect(featureFlag.variants).not.toContainEqual(
      expect.objectContaining({ index })
    );
  });

  test("should calculate if redistribution is required", () => {
    featureFlag.variants = [
      { rolloutPercentage: 30 },
      { rolloutPercentage: 40 },
      { rolloutPercentage: 30 },
    ];
    expect(featureFlag.isRedDistribution).toBe(true);

    featureFlag.variants = [
      { rolloutPercentage: 33 },
      { rolloutPercentage: 33 },
      { rolloutPercentage: 34 },
    ];
    expect(featureFlag.isRedDistribution).toBe(false);
  });

  test("should redistribute the variants", () => {
    featureFlag.variants = [{ rolloutPercentage: 30 }, { rolloutPercentage: 30 }];

    featureFlag.redistributeVariants();

    expect(featureFlag.variants[0].rolloutPercentage).toBe(50);
    expect(featureFlag.variants[1].rolloutPercentage).toBe(50);
  });

  test("should convert to plain JavaScript object", () => {
    const conditions = [{ rolloutPercentage: 50 }];
    const variants = [
      { value: "variant1", description: "description1", rolloutPercentage: 30 },
      { value: "variant2", description: "description2", rolloutPercentage: 70 },
    ];
    featureFlag.name = "Feature Flag";
    featureFlag.flagKey = "flag-key";
    featureFlag.conditions = conditions;
    featureFlag.variants = variants;

    const result = featureFlag.toJS();

    expect(result).toEqual({
      name: featureFlag.name,
      flagKey: featureFlag.flagKey,
      conditions: conditions.map((c) => c.toJS()),
      createdBy: featureFlag.createdBy,
      updatedBy: featureFlag.createdBy,
      createdAt: featureFlag.createdAt,
      updatedAt: featureFlag.updatedAt,
      isActive: featureFlag.isActive,
      description: featureFlag.description,
      isPersist: featureFlag.isPersist,
      flagType: featureFlag.isSingleOption ? "single" : "multi",
      featureFlagId: featureFlag.featureFlagId,
      variants: featureFlag.isSingleOption
                ? undefined
                : variants.map((v) => ({
          value: v.value,
          description: v.description,
          payload: v.payload,
          rolloutPercentage: v.rolloutPercentage,
        })),
    });
  });

  test("should add a condition", () => {
    const initialLength = featureFlag.conditions.length;
    featureFlag.addCondition();

    expect(featureFlag.conditions.length).toBe(initialLength + 1);
  });

  test("should remove a condition", () => {
    const index = 1;
    featureFlag.removeCondition(index);

    expect(featureFlag.conditions.length).toBe(0);
    expect(featureFlag.conditions).not.toContainEqual(
      expect.objectContaining({ index })
    );
  });

  test("should set the flag key", () => {
    const flagKey = "flag-key";
    featureFlag.setFlagKey(flagKey);

    expect(featureFlag.flagKey).toBe(flagKey);
  });

  test("should set the description", () => {
    const description = "Flag description";
    featureFlag.setDescription(description);

    expect(featureFlag.description).toBe(description);
  });

  test("should set the persistence option", () => {
    const isPersist = true;
    featureFlag.setIsPersist(isPersist);

    expect(featureFlag.isPersist).toBe(isPersist);
  });

  test("should set the single option", () => {
    const isSingleOption = false;
    featureFlag.setIsSingleOption(isSingleOption);

    expect(featureFlag.isSingleOption).toBe(isSingleOption);
  });

  test("should set the enabled state", () => {
    const isEnabled = true;
    featureFlag.setIsEnabled(isEnabled);

    expect(featureFlag.isActive).toBe(isEnabled);
  });

  test("should set the name", () => {
    const name = "Flag Name";
    featureFlag.setName(name);

    expect(featureFlag.name).toBe(name);
  });
});
