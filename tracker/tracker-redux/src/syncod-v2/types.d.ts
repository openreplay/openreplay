declare type HashFunction = (str: string) => string;
declare type Dict = { [key: string]: string };

export class Encoder {
  constructor(hash: HashFunction, slen?: number);
  commit(): Dict;
  encode(obj: any): string;
  clear(): void;
}

export class Decoder {
  constructor();
  set(ref: string, enc: string): void;
  assign(dict: Dict): void;
  decode(enc: string): any;
  clear(): void;
}

export const sha1: HashFunction;
export const murmur: HashFunction;
