import untar, { TarFile } from 'js-untar';

const unpackTar = (data: Uint8Array): Promise<TarFile[]> => {
  const isTar = true;
  // tarball ustar starts from 257, 75 73 74 61 72, but this is getting lost here for some reason
  // so we rely on try catch
  // data[257] === 0x75 &&
  // data[258] === 0x73 &&
  // data[259] === 0x74 &&
  // data[260] === 0x61 &&
  // data[261] === 0x72 &&
  // data[262] === 0x00;

  if (isTar) {
    const now = performance.now();
    return untar(data.buffer).then((files) => {
      console.debug(
        'Tar unpack time',
        `${Math.floor(performance.now() - now)}ms`,
      );
      return files;
    });
  }
  return Promise.reject('Not a tarball file');
};

export default unpackTar;
