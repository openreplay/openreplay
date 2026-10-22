import { describe, expect, test } from '@jest/globals';
import { TextDecoder as NodeTextDecoder } from 'util';

import { configurePlayer } from '../../../player/src/config';
import { requestEFSDom } from '../../../player/src/web/network/loadFiles';

if (typeof globalThis.TextDecoder === 'undefined') {
  (globalThis as any).TextDecoder = NodeTextDecoder;
}

const reply = (status: number, body: Uint8Array, type?: string) =>
  ({
    status,
    headers: {
      get: (h: string) => (h === 'content-type' ? (type ?? null) : null),
    },
    arrayBuffer: async () =>
      body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength),
  }) as unknown as Response;

const efs = (res: Response) =>
  configurePlayer({
    efsClient: {
      fetch: async () => res,
      forceSiteId: () => {},
      setSiteIdCheck: () => {},
    },
  });

const text = (s: string) => new TextEncoder().encode(s);

describe('unprocessed (EFS) file fallback', () => {
  test('a 200 carrying {"errors": [...]} is a missing file', async () => {
    efs(
      reply(
        200,
        text('{"errors":["Replay file not found"]}'),
        'application/json',
      ),
    );
    await expect(requestEFSDom('1')).rejects.toBe('No-efs-file');
  });

  test('the same body without a JSON content type is still a missing file', async () => {
    efs(reply(200, text('{"errors":["Replay file not found"]}')));
    await expect(requestEFSDom('1')).rejects.toBe('No-efs-file');
  });

  test('a 4xx is a missing file', async () => {
    efs(reply(404, text('not found')));
    await expect(requestEFSDom('1')).rejects.toBe('No-efs-file');
  });

  test('a binary file is returned as is, even one starting with "{"', async () => {
    const bin = new Uint8Array([0x7b, 0x00, 0xff, 0x10, 0x81]);
    efs(reply(200, bin));
    await expect(requestEFSDom('1')).resolves.toEqual(bin);
  });
});
