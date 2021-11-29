import Writer from "./writer.js";

export default interface Message {
  encode(w: Writer): boolean;
}
