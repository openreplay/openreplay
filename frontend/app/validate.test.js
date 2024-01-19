import { validateURL } from './validate';

describe('validateURL', () => {
  test('validates standard URLs', () => {
    expect(validateURL('http://www.example.com')).toBeTruthy();
    expect(validateURL('https://example.com')).toBeTruthy();
    expect(validateURL('https://sub.example.com/path')).toBeTruthy();
  });

  test('validates localhost URLs', () => {
    expect(validateURL('http://localhost')).toBeTruthy();
    expect(validateURL('https://localhost:8080')).toBeTruthy();
    expect(validateURL('http://localhost/path')).toBeTruthy();
  });

  test('validates IP address URLs', () => {
    expect(validateURL('http://127.0.0.1')).toBeTruthy();
    expect(validateURL('https://192.168.1.1')).toBeTruthy();
    expect(validateURL('http://192.168.1.1:3000/path')).toBeTruthy();
  });

  test('rejects invalid URLs', () => {
    expect(validateURL('justastring')).toBeFalsy();
    expect(validateURL('http://')).toBeFalsy();
    expect(validateURL('https://.com')).toBeFalsy();
    expect(validateURL('256.256.256.256')).toBeFalsy(); // Invalid IP
    expect(validateURL('http://example')).toBeFalsy(); // Missing TLD
  });

  test('rejects non-string inputs', () => {
    expect(validateURL(12345)).toBeFalsy();
    expect(validateURL({ url: 'http://example.com' })).toBeFalsy();
    expect(validateURL(['http://example.com'])).toBeFalsy();
    expect(validateURL(null)).toBeFalsy();
    expect(validateURL(undefined)).toBeFalsy();
  });
});
