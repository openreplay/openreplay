import {
  ResourceType,
  getURLExtention,
  getResourceType,
  getResourceName,
  Resource,
  getResourceFromResourceTiming,
  getResourceFromNetworkRequest,
} from '../app/player/web/types/resource';
import type { ResourceTiming, NetworkRequest } from '../app/player/web/messages';
import { test, describe, expect } from "@jest/globals";

describe('getURLExtention', () => {
  test('should return the correct extension', () => {
    expect(getURLExtention('https://test.com/image.png')).toBe('png');
    expect(getURLExtention('https://test.com/script.js')).toBe('js');
    expect(getURLExtention('https://test.com/style.css')).toBe('css');
    expect(getURLExtention('https://test.com')).toBe('com');
  });
});

describe('getResourceType', () => {
  test('should return the correct resource type based on initiator and URL', () => {
    expect(getResourceType('fetch', 'https://test.com')).toBe(ResourceType.FETCH);
    expect(getResourceType('beacon', 'https://test.com')).toBe(ResourceType.BEACON);
    expect(getResourceType('img', 'https://test.com')).toBe(ResourceType.IMG);
    expect(getResourceType('unknown', 'https://test.com/script.js')).toBe(ResourceType.SCRIPT);
    expect(getResourceType('unknown', 'https://test.com/style.css')).toBe(ResourceType.CSS);
    expect(getResourceType('unknown', 'https://test.com/image.png')).toBe(ResourceType.IMG);
    expect(getResourceType('unknown', 'https://test.com/video.mp4')).toBe(ResourceType.MEDIA);
    expect(getResourceType('unknown', 'https://test.com')).toBe(ResourceType.OTHER);
  });
});

describe('getResourceName', () => {
  test('should return the last non-empty section of a URL', () => {
    expect(getResourceName('https://test.com/path/to/resource')).toBe('resource');
    expect(getResourceName('https://test.com/another/path/')).toBe('path');
    expect(getResourceName('https://test.com/singlepath')).toBe('singlepath');
    expect(getResourceName('https://test.com/')).toBe('test.com');
  });
});

describe('Resource', () => {
  test('should return the correct resource object', () => {
    const testResource = {
      time: 123,
      type: ResourceType.SCRIPT,
      url: 'https://test.com/script.js',
      status: '2xx-3xx',
      method: 'GET',
      duration: 1,
      success: true,
    };
    const expectedResult = {
      ...testResource,
      name: 'script.js',
      isRed: false,
      isYellow: false,
    };
    expect(Resource(testResource)).toEqual(expectedResult);
  });
});

describe('getResourceFromResourceTiming', () => {
  test('should return the correct resource from a ResourceTiming object', () => {
    const testResourceTiming: ResourceTiming = {
      tp: 116,
      timestamp: 123,
      duration: 1,
      ttfb: 100,
      headerSize: 200,
      encodedBodySize: 300,
      decodedBodySize: 400,
      url: 'https://test.com/script.js',
      initiator: 'fetch',
      transferredSize: 500,
      cached: false,
      time: 123
    };
    const expectedResult = Resource({
      ...testResourceTiming,
      type: ResourceType.FETCH,
      method: '..',
      success: true,
      status: '2xx-3xx',
      time: 123,
    });
    expect(getResourceFromResourceTiming(testResourceTiming, 0)).toEqual(expectedResult);
  });
});

describe('getResourceFromNetworkRequest', () => {
  test('should return the correct resource from a NetworkRequest or Fetch object', () => {
    const testNetworkRequest: NetworkRequest = {
      tp: 83,
      type: 'fetch',
      method: 'POST',
      url: 'https://test.com/data',
      request: 'test',
      response: 'test',
      status: 200,
      timestamp: 123,
      duration: 1,
      transferredBodySize: 100,
      time: 123
    } as const;
    // @ts-ignore
    const expectedResult = Resource({
      ...testNetworkRequest,
      success: true,
      status: '200',
      time: 123,
      decodedBodySize: 100,
    });
    expect(getResourceFromNetworkRequest(testNetworkRequest, 0)).toEqual(expectedResult);
  });
});
