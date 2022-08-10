export interface Writer {
  uint(n: number): boolean
  int(n: number): boolean
  string(s: string): boolean
  boolean(b: boolean): boolean
}

export interface Message {
  encode(w: Writer): boolean;
}
