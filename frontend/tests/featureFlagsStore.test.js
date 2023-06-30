import { jest, test, expect, describe } from '@jest/globals';
import FeatureFlag from 'App/mstore/types/FeatureFlag';
import FeatureFlagsStore from 'App/mstore/FeatureFlagsStore';

const mockFflagsService = {
    fetchFlags: jest.fn(),
    createFlag: jest.fn(),
    updateFlag: jest.fn(),
    deleteFlag: jest.fn(),
    getFlag: jest.fn(),
};

// not working
jest.mock('App/services', () => {
    return {
        fflagsService: mockFflagsService,
    };
});

// working fine?
jest.mock('App/mstore/types/FeatureFlag', () => {
    class FakeClass {
        constructor(data) {
            Object.assign(this, data);
        }
        setHasChanged() {
            return jest.fn(() => this)
        }

        toJS() {
            return jest.fn(() => this)
        }
    }
    return FakeClass;
})

describe('FeatureFlagsStore', () => {
    test('should fetch flags', async () => {
        const mockFlags = [{ featureFlagId: 1 }, { featureFlagId: 2 }];
        mockFflagsService.fetchFlags.mockResolvedValueOnce({ list: mockFlags });
        const store = new FeatureFlagsStore(mockFflagsService);

        await store.fetchFlags();

        expect(store.flags.length).toBe(mockFlags.length);
        expect(store.flags[0].featureFlagId).toBe(mockFlags[0].featureFlagId);
        expect(store.flags[1].featureFlagId).toBe(mockFlags[1].featureFlagId);
    });

    test('should create a flag', async () => {
        const mockFlag = { featureFlagId: 3 };
        mockFflagsService.createFlag.mockResolvedValueOnce(mockFlag);
        const store = new FeatureFlagsStore(mockFflagsService);
        store.setCurrentFlag(new FeatureFlag())

        await store.createFlag();

        expect(store.flags.length).toBe(1);
        expect(store.flags[0].featureFlagId).toBe(mockFlag.featureFlagId);
    });

    test('should update a flag', async () => {
        const mockFlag = { featureFlagId: 4 };
        mockFflagsService.updateFlag.mockResolvedValueOnce(mockFlag);
        const store = new FeatureFlagsStore(mockFflagsService);
        store.currentFflag = new FeatureFlag();

        await store.updateFlag();

        expect(store.currentFflag.featureFlagId).toBe(mockFlag.featureFlagId);
    });

    test('should delete a flag', async () => {
        const mockFlagId = 5;
        mockFflagsService.deleteFlag.mockResolvedValueOnce();
        const store = new FeatureFlagsStore(mockFflagsService);
        store.flags = [new FeatureFlag({ featureFlagId: mockFlagId })];

        await store.deleteFlag(mockFlagId);

        expect(store.flags.length).toBe(0);
    });

    test('should fetch a flag', async () => {
        const mockFlag = { featureFlagId: 6 };
        mockFflagsService.getFlag.mockResolvedValueOnce(mockFlag);
        const store = new FeatureFlagsStore(mockFflagsService);

        await store.fetchFlag(mockFlag.featureFlagId);

        expect(store.currentFflag.featureFlagId).toBe(mockFlag.featureFlagId);
    });
});