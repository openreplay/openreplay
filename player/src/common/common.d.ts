declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}

declare module 'js-untar' {
  export interface TarFile {
    name: string;
    blob: Blob;
    buffer: ArrayBuffer;
    getBlobUrl: () => string;
  }

  export default function untar(tarFile: ArrayBuffer): Promise<TarFile[]>;
}
