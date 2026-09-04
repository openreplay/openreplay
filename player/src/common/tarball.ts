import { unpackTar as unpackTarEntries } from 'modern-tar';

import { FrameSnapshot } from './parseFrames';

export interface TarFile extends FrameSnapshot {
  name: string;
}

const unpackTar = async (data: Uint8Array): Promise<TarFile[]> => {
  const now = performance.now();

  // Non-strict on purpose: a tarball whose trailing EOF blocks got cut off
  // still yields the frames it does contain instead of failing the session.
  // Bogus headers can't blow up memory either — the parser clamps a claimed
  // entry size to the bytes actually present.
  const entries = await unpackTarEntries(data);
  console.debug('Tar unpack time', `${Math.floor(performance.now() - now)}ms`);

  const files = entries
    .filter((entry) => entry.data !== undefined)
    .map((entry) => ({
      name: entry.header.name,
      // Not cached: CanvasManager revokes the url of the frame it steps off,
      // so a re-seek to the same file has to mint a fresh one
      getBlobUrl: () => URL.createObjectURL(new Blob([entry.data!])),
    }));

  // Both mapToSnapshots implementations index files[0] unguarded
  if (!files.length) {
    return Promise.reject('Not a tarball file');
  }

  return files;
};

export default unpackTar;
