import Writer from './writer';

export default interface Message {
  encode(w: Writer): boolean;
}
